# Basis per Digest gepinnt, nicht per beweglichem Tag (CC-ADR 0015).
# Der Digest ist der Index der Multi-Arch-Liste, aus der Registry gelesen
# am 11.09.2026 mit 'docker buildx imagetools inspect ruby:3.3.6'. Er wird
# beim bewussten Anheben der Basis ausgetauscht, in einem eigenen Commit.
FROM ruby:3.3.6@sha256:347edd0c70ee08d87de9f01b99de2f14a64cedb5d1bfb38457dfe8cd0bf113c5
MAINTAINER "Christoph Fabianek" christoph@ownyourdata.eu

WORKDIR /usr/src/app
ENV RAILS_ROOT $WORKDIR
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
