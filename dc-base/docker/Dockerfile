# Basis per Digest gepinnt, nicht per beweglichem Tag (CC-ADR 0015).
# Der Digest ist der Index der Multi-Arch-Liste, aus der Registry gelesen
# am 11.09.2026 mit 'docker buildx imagetools inspect ruby:3.3.8'. Er wird
# beim bewussten Anheben der Basis ausgetauscht, in einem eigenen Commit.
FROM ruby:3.3.8@sha256:3e0e01e30c20e1e3546c696ac8d7226fc93a34bbbd0b29eb6edb97ca49bf2ba8
LABEL org.opencontainers.image.authors="Christoph Fabianek <christoph@ownyourdata.eu>"
WORKDIR /usr/src/app
# WORKDIR setzt keine gleichnamige Variable. Hier stand deshalb jahrelang
# 'ENV RAILS_ROOT $WORKDIR' - und damit RAILS_ROOT auf den leeren String,
# weshalb das mkdir darunter /tmp/pids anlegte statt tmp/pids im
# Anwendungsverzeichnis. Aufgefallen ist es nie, weil niemand RAILS_ROOT
# sonst liest und Rails sein tmp/ beim Start selbst anlegt.
ENV RAILS_ROOT=/usr/src/app
RUN mkdir -p $RAILS_ROOT/tmp/pids && \
	apt-get update && \
	apt-get install -y --no-install-recommends \
  		libsodium-dev \
		build-essential && \
	rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Gemfile.lock muss mit in den Kontext, sonst loest 'bundle install' im Image
# frisch auf und die Sperrdatei im Repo waere wirkungslos. Ziel ausgeschrieben:
# $WORKDIR ist keine Variable, die die WORKDIR-Anweisung setzt, sondern leer.
COPY Gemfile Gemfile.extend Gemfile.lock ./

# Kein 'bundle update' (CC-ADR 0015): ein Bau installiert, was in Gemfile.lock
# steht, und hebt nichts an. Ein Versionssprung ist eine Aenderung am
# Quellstand und gehoert in einen Commit, nicht in einen Bau.
RUN git config --global url."https://".insteadOf git:// && \
	bundle install
COPY . .

# rake app:update:bin ist hier bewusst nicht mehr aufgerufen: Rails 7.2
# kennt die Task nicht mehr (framework.rake hat nur noch app:template und
# app:templates:copy), und die Binstubs in bin/ liegen ohnehin im Repo.
RUN ln -s $PWD/script/init.sh /bin/init.sh

CMD ["./script/init.sh"]

EXPOSE 3000
