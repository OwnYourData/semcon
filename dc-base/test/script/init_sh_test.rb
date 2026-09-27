# frozen_string_literal: true

require "test_helper"
require "open3"
require "tmpdir"
require "fileutils"

# Das Verhalten von script/init.sh, ohne Datenbank: `bundle` und `bin/rails`
# sind durch Attrappen ersetzt, die ihre Aufrufe mitschreiben. Die echte Probe
# gegen Postgres hinter PgBouncer liegt in dc-pod: test/startup/run.sh.
#
# Festgehalten wird, was am 27.09.2026 bei pod-dpp-Staging fehlte:
#   - ein gescheitertes db:migrate wird wiederholt,
#   - scheitert es endgueltig, endet init.sh mit Exit-Code ungleich 0 und
#     startet Puma NICHT.
class InitShTest < ActiveSupport::TestCase
    INIT_SH = Rails.root.join("script/init.sh")

    FAKE_BUNDLE = <<~'SH'
        #!/bin/bash
        echo "bundle $*" >> "$FAKE_LOG"
        case "$*" in
            "exec rake db:create")
                [ "${FAKE_CREATE_FAILS:-0}" = 1 ] && exit 1
                exit 0 ;;
            "exec rake db:migrate")
                n=$(cat "$FAKE_COUNTER" 2>/dev/null || echo 0)
                n=$((n + 1))
                echo "$n" > "$FAKE_COUNTER"
                [ "$n" -le "${FAKE_MIGRATE_FAILURES:-0}" ] && exit 1
                exit 0 ;;
        esac
        exit 2
    SH

    FAKE_RAILS = <<~'SH'
        #!/bin/bash
        echo "rails $*" >> "$FAKE_LOG"
        exit 0
    SH

    Result = Struct.new(:status, :stdout, :stderr, :calls, keyword_init: true) do
        def migrate_calls = calls.count("bundle exec rake db:migrate")
        def server_started? = calls.include?("rails server -b 0.0.0.0")
    end

    def run_init(migrate_failures: 0, create_fails: false, attempts: nil, pause: "0")
        Dir.mktmpdir do |dir|
            FileUtils.mkdir_p(File.join(dir, "script"))
            FileUtils.cp(INIT_SH, File.join(dir, "script/init.sh"))
            write_executable(File.join(dir, "bin/rails"), FAKE_RAILS)
            write_executable(File.join(dir, "fakebin/bundle"), FAKE_BUNDLE)

            log = File.join(dir, "calls.log")
            env = {
                "PATH" => "#{File.join(dir, 'fakebin')}:#{ENV.fetch('PATH')}",
                "FAKE_LOG" => log,
                "FAKE_COUNTER" => File.join(dir, "migrate.count"),
                "FAKE_MIGRATE_FAILURES" => migrate_failures.to_s,
                "FAKE_CREATE_FAILS" => create_fails ? "1" : "0",
                "DC_DB" => nil,
                "DC_MIGRATE_ATTEMPTS" => attempts,
                "DC_MIGRATE_PAUSE" => pause
            }
            # Aufgerufen aus einem anderen Verzeichnis: init.sh muss selbst in
            # das Anwendungsverzeichnis wechseln.
            stdout, stderr, status = Open3.capture3(env, "bash", File.join(dir, "script/init.sh"), chdir: Dir.tmpdir)
            calls = File.exist?(log) ? File.readlines(log, chomp: true) : []
            Result.new(status: status, stdout: stdout, stderr: stderr, calls: calls)
        end
    end

    def write_executable(path, content)
        FileUtils.mkdir_p(File.dirname(path))
        File.write(path, content)
        File.chmod(0o755, path)
    end

    test "the happy path creates, migrates once and starts the server" do
        r = run_init
        assert r.status.success?, r.stderr
        assert_equal ["bundle exec rake db:create", "bundle exec rake db:migrate", "rails server -b 0.0.0.0"], r.calls
        assert_includes r.stdout, "db:migrate erfolgreich (Versuch 1/6)"
    end

    test "a failed migration is retried until it succeeds" do
        r = run_init(migrate_failures: 2)
        assert r.status.success?, r.stderr
        assert_equal 3, r.migrate_calls
        assert r.server_started?
        assert_includes r.stderr, "db:migrate gescheitert (Versuch 1/6)"
        assert_includes r.stderr, "db:migrate gescheitert (Versuch 2/6)"
        assert_includes r.stdout, "db:migrate erfolgreich (Versuch 3/6)"
    end

    test "a migration that keeps failing ends init.sh non-zero and never starts the server" do
        r = run_init(migrate_failures: 99, attempts: "3")
        refute r.status.success?
        assert_equal 1, r.status.exitstatus
        assert_equal 3, r.migrate_calls
        refute r.server_started?, "Puma must not start without a schema"
        assert_includes r.stderr, "nach 3 Versuchen endgueltig gescheitert"
    end

    test "the default is six attempts" do
        r = run_init(migrate_failures: 99)
        refute r.status.success?
        assert_equal 6, r.migrate_calls
        refute r.server_started?
    end

    test "a failed db:create is not fatal - db:migrate decides" do
        r = run_init(create_fails: true)
        assert r.status.success?, r.stderr
        assert_includes r.stderr, "db:create gescheitert"
        assert r.server_started?
    end

    test "invalid attempt counts fall back to the default" do
        ["0", "-1", "abc", ""].each do |value|
            r = run_init(migrate_failures: 99, attempts: value)
            assert_equal 6, r.migrate_calls, "DC_MIGRATE_ATTEMPTS=#{value.inspect}"
        end
    end

    test "the server replaces the shell (exec), so it receives SIGTERM directly" do
        assert_match(/^exec bin\/rails server -b 0\.0\.0\.0$/, File.read(INIT_SH))
    end
end
