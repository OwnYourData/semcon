#!/bin/bash
#
# Start eines Pods: Datenbank anlegen, Schema migrieren, Puma starten.
#
# Diese Datei tragen alle aus dc-base abgeleiteten Images (dc-pod, pod-dpp,
# pod-eeg, pod-api_sharing), solange sie script/init.sh nicht selbst per
# COPY . . ueberschreiben. Die Datenbank-Umschaltung am Anfang ist seit jeher
# unveraendert; neu ist, was nach db:create passiert.
#
# Warum db:migrate wiederholt wird
# --------------------------------
# Am 27.09.2026 startete pod-dpp-Staging gegen eine noch nicht vorhandene
# Datenbank hinter PgBouncer. Der Start-Code griff schon waehrend db:create auf
# die Datenbank zu (dc-pod, config/initializers/startup.rb) und scheiterte mit
# NoDatabaseError. PgBouncer merkt sich einen fehlgeschlagenen Login
# (server_login_retry, Standard 15 s) und lehnt in diesem Fenster jede weitere
# Anmeldung an dieselbe Datenbank mit dem gespeicherten Fehler ab - auch dann,
# wenn die Datenbank inzwischen existiert. db:migrate fiel genau in dieses
# Fenster.
#
# dc-pod fasst die Datenbank waehrend Rake-Tasks inzwischen nicht mehr an. Die
# Wiederholung gehoert trotzdem hierher, in die unterste Schicht: auch ein
# Datenbank-Server, der gerade erst hochkommt, oder ein Pooler, der einen
# Fehlschlag aus einem anderen Pod gespeichert hat, sind voruebergehend.
#
# Warum ein endgueltiges Scheitern den Container beendet
# ------------------------------------------------------
# Vorher lief Puma nach einem gescheiterten db:migrate trotzdem an. Eine
# tcpSocket-Pruefung meldete den Pod als bereit, rollout status meldete Erfolg,
# und jede Anfrage endete mit 500. Ein Pod ohne Schema darf nicht laufen: er
# beendet sich mit einem Exit-Code ungleich 0 und geht sichtbar in CrashLoop.
#
# Stellschrauben (ganze Zahlen, sonst gilt der Vorgabewert):
#   DC_MIGRATE_ATTEMPTS  Anzahl der Versuche fuer db:migrate      (Vorgabe 6)
#   DC_MIGRATE_PAUSE     Sekunden zwischen zwei Versuchen         (Vorgabe 10)
# Mit den Vorgaben wartet der Start hoechstens 50 s zusaetzlich - mehr als das
# Dreifache von server_login_retry.

cd "$(dirname "$0")/.." || exit 1

# handle DB settings
if [ "$DC_DB" == "postgres" ]
then
	cp config/database_pg.yml config/database.yml
	cp db/migrate_pg/* db/migrate/
fi
if [ "$DC_DB" == "kubernetes" ]
then
	cp config/database_k8s.yml config/database.yml
	cp db/migrate_pg/* db/migrate/
fi

positive_int_or_default() {
	case "$1" in
		''|*[!0-9]*) echo "$2" ;;
		*) if [ "$1" -ge "$3" ]; then echo "$1"; else echo "$2"; fi ;;
	esac
}

MIGRATE_ATTEMPTS=$(positive_int_or_default "${DC_MIGRATE_ATTEMPTS:-}" 6 1)
MIGRATE_PAUSE=$(positive_int_or_default "${DC_MIGRATE_PAUSE:-}" 10 0)

# db:create bleibt nicht-fatal: existiert die Datenbank schon, meldet Rails das
# und laeuft weiter; fehlt dem Benutzer das Recht CREATEDB, weil die Datenbank
# vom Betrieb angelegt wurde, darf der Start daran nicht scheitern. Ob die
# Datenbank benutzbar ist, entscheidet db:migrate.
if ! bundle exec rake db:create
then
	echo "[init] db:create gescheitert - weiter mit db:migrate" >&2
fi

attempt=1
while true
do
	if bundle exec rake db:migrate
	then
		echo "[init] db:migrate erfolgreich (Versuch ${attempt}/${MIGRATE_ATTEMPTS})"
		break
	fi
	if [ "$attempt" -ge "$MIGRATE_ATTEMPTS" ]
	then
		echo "[init] db:migrate nach ${MIGRATE_ATTEMPTS} Versuchen endgueltig gescheitert - Puma wird nicht gestartet" >&2
		exit 1
	fi
	echo "[init] db:migrate gescheitert (Versuch ${attempt}/${MIGRATE_ATTEMPTS}) - neuer Versuch in ${MIGRATE_PAUSE} s" >&2
	sleep "$MIGRATE_PAUSE"
	attempt=$((attempt + 1))
done

# exec: Puma wird PID 1 und bekommt das SIGTERM von Kubernetes direkt. Ohne
# exec faengt die Shell das Signal ab, der Pod wartet die volle Grace Period
# und wird dann hart beendet.
exec bin/rails server -b 0.0.0.0
