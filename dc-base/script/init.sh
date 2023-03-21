#!/bin/bash

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
bundle exec rake db:create
bundle exec rake db:migrate
/usr/src/app/bin/rails server -b 0.0.0.0