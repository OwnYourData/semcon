FROM ruby:3.1.4
MAINTAINER "Christoph Fabianek" christoph@ownyourdata.eu

WORKDIR /usr/src/app
ENV RAILS_ROOT $WORKDIR
RUN mkdir -p $RAILS_ROOT/tmp/pids && \
	apt-get update && \
	apt-get install -y --no-install-recommends \
  		libsodium-dev \
		build-essential && \
	rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

COPY Gemfile Gemfile.extend $WORKDIR

RUN git config --global url."https://".insteadOf git:// && \
	bundle install && \
	bundle update
COPY . .

RUN bundle update && \
	rake app:update:bin && \
	ln -s $PWD/script/init.sh /bin/init.sh

CMD ["./script/init.sh"]

EXPOSE 3000
