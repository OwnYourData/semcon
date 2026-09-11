# dc-base — Operating-Brief für Dev-Claude

Stand: 2026-09-10. Gepflegt vom System-Coach; Ergänzungen aus der Arbeit trägst du selbst nach.

## Was dieses Repo ist

`dc-base` ist die **unterste Schicht** der Pod-Familie des Daten Intermediärs: eine Rails-Anwendung, die den `semcon`-Gem einbettet und die generischen Bausteine bereitstellt, auf denen alle abgeleiteten Pods aufsetzen. Das Image heißt `oydeu/dc-base`.

```
dc-base                     generische Bausteine, kein Domänenwissen
  └─ dc-pod                 DGA-Backend-Funktionen, Delegationsapparat
       ├─ pod-dpp           Digital Product Passport
       ├─ pod-eeg           Energiegemeinschaften (früher dc-eeg)
       └─ pod-api_sharing   API-Sharing-Use-Case
```

Abgeleitete Images überschreiben Dateien per `COPY . .` und erweitern Routen über `config/routes/extend.rb` bzw. `extend2.rb` sowie Abhängigkeiten über `Gemfile.extend`. **Was du hier änderst, wirkt in jedem dieser Pods.** Das ist der wichtigste Satz dieses Dokuments.

## Was hier liegt und was nicht

In `app/services/` liegen vier Bausteine, dokumentiert in `docs/DID-and-JWS.md`:

| Datei | Zweck |
| --- | --- |
| `jwk.rb` | JWK ↔ Ed25519-Rohschlüssel, Thumbprint nach RFC 7638 (`jkt`), striktes base64url |
| `jws.rb` | kompaktes JWS mit `alg: EdDSA`; `typ` und `allow` sind **Pflichtargumente**, nicht Optionen; `alg` wird nie aus dem Token übernommen; `crit` faellt mit eigenem Grund, jeder Header-Parameter ausserhalb von `allow` mit `:header_not_allowed` (CC-ADR 0013, Nachtrag 10.09.2026) |
| `did_document.rb` | Schlüsselwahl über `kid`; nur `publicKeyMultibase` mit Multicodec `ed25519-pub`; unbekanntes `kid` liefert **keinen** Schlüssel |
| `did_resolver.rb` | fremde `did:oyd` über `Oydid.read`; `Rails.cache` positiv 300 s / negativ 60 s; Timeout 5 s; **kein** Rückfall auf die lokale `dids`-Tabelle |

Dazu zwei Erweiterungspunkte in `config/initializers/doorkeeper.rb`: `grant_flows` über die Umgebungsvariable `DC_GRANT_FLOWS`, und `access_token_methods` um ein Lambda erweitert, das `Authorization: DPoP <token>` erkennt (Doorkeepers `from_bearer_authorization` matcht nur auf `Bearer`).

**Das Wort „Delegation" kommt in `dc-base` nicht vor** und soll es nicht. Der gesamte Delegationsapparat — Prüfregeln, Datenmodell, Token-Ausgabe, Widerruf — lebt in `dc-pod`. Hier liegt nur Kryptografie und DID-Auflösung, brauchbar auch für jeden anderen Anwendungsfall. Wenn du dich dabei ertappst, hier eine Regel über Vollmachten zu schreiben, ist die Datei falsch gewählt.

## Harte Regeln

**Keine Methode, die es nicht in jeder `oydid`-Version gibt**, die ein abgeleitetes Image auflösen könnte. `Oydid.multi_decode` existiert erst ab 0.5; der Aufruf lief in einem älteren Image in ein `rescue`, lieferte `nil` statt eines Schlüssels — und das sah von außen aus wie eine falsche Signatur. `DidDocument` dekodiert Multibase deshalb selbst, mit sechzehn Zeilen base58 und der Prüfung auf die zwei Multicodec-Bytes. Diese Entscheidung bleibt.

**Zwei Ursachen bekommen nie denselben Log-Grund.** „Kein Schlüssel" und „Signatur falsch" sind verschiedene Diagnosen. Nach außen ist beides derselbe Fehlercode — im Log müssen sie unterscheidbar bleiben, sonst wird geraten statt diagnostiziert.

**Fehler als Grund-Symbol, nicht als Ausnahme.** Alle vier Bausteine geben `Result`-Strukturen zurück. Aufrufer loggen den Grund und antworten generisch — eine präzise Fehlermeldung nach außen ist eine Anleitung zum nächsten Fälschungsversuch.

**Keine neuen Gems ohne Rückfrage.** `rbnacl` liegt bereits transitiv über `oydid` im Lockfile; damit ist EdDSA ohne zusätzliche Abhängigkeit machbar. Eine neue Abhängigkeit hier zieht sie in vier abgeleitete Images.

**Fail-closed.** Was sich nicht ausdrücklich anmeldet oder nicht eindeutig besteht, wird abgelehnt.

**Konfiguration wirkt nur aus `config/initializers/`.** In `dc-pod` liegt eine tote `config/doorkeeper.rb` außerhalb dieses Verzeichnisses, die Rails nie lädt. Wirksam ist ausschließlich `dc-base/config/initializers/doorkeeper.rb`. Wer dort etwas ändert und sich wundert, warum nichts passiert, hat die falsche Datei erwischt.

## Verträge, die du nicht einseitig ändern darfst

`Delegation.md` (öffentlich unter `OwnYourData/dpp-service-public/blob/main/docs/Delegation.md`) ist gemeinsamer Vertrag mit dem DPP Service. Die elf Schreib-Vektoren in `dc-pod/test/fixtures/delegation-vectors/` und die elf Lese-Vektoren in `dc-pod/test/fixtures/read-delegation-vectors/` prüfen ihn von beiden Seiten. **Die Bedeutung eines bestehenden Claims zu ändern bricht die Gegenseite still.** Wenn eine Änderung hier einen dieser Vektoren rot macht, ist das keine Testanpassung, sondern eine Eskalation an den System-Coach.

Dasselbe gilt für die Cross-Component-ADRs in `~/dev/intermediary/architecture/docs/decisions/`, insbesondere **CC-ADR 0013** (Lese-Vollmacht per DID). Wo ADR und Code sich widersprechen, gilt die ADR. Wo die ADR eine Frage nicht beantwortet, entscheidest du sie **nicht** selbst, sondern legst sie unter „OFFENE FRAGEN" vor.

## Bauen, Starten, Testen

```
bash build.sh                  Image lokal bauen (oydeu/dc-base:latest, linux/amd64)
bash build.sh --dockerhub      zusätzlich in die Registry pushen
bash build.sh --local          gegen lokal gebaute semcon- und oydid-Gems aus ../ruby-gem bauen
bash build.sh --arm            arm64v8-Variante
```

**`build.sh` vergibt nur `latest`.** Den datierten, unveraenderlichen Tag, den CC-ADR 0015 fuer jeden Bau verlangt, setzt du danach von Hand — `docker tag oydeu/dc-base:latest oydeu/dc-base:YYMMDD`, dann erst `docker push` des datierten Tags und danach der von `latest`. Der unveraenderliche Zeiger soll existieren, bevor der bewegliche umgehaengt wird. Deployments referenzieren ausschliesslich den datierten Tag.

Nach jedem Push den Registry-Stand mit `docker buildx imagetools inspect oydeu/dc-base:<tag>` gegenlesen, nicht der Push-Quittung glauben: die ist eine Behauptung des Clients. Bricht ein Push mit `net/http: timeout awaiting response headers` ab, denselben Befehl allein wiederholen — abgeschlossene Schichten werden nicht erneut uebertragen —, und ihn nicht in eine `&&`-Kette haengen, sonst reisst der Abbruch den naechsten Schritt mit.

**Basis und Abhaengigkeiten sind gepinnt (CC-ADR 0015).** `docker/Dockerfile` beginnt mit `FROM ruby:3.3.6@sha256:347edd0c…`; der Digest wird nur in einem eigenen, begruendeten Commit ausgetauscht. `bundle update` steht nicht mehr darin, und `Gemfile.lock` liegt im Build-Kontext — beides gehoert zusammen: ohne die Sperrdatei im Kontext loest `bundle install` frisch auf, und das Streichen von `bundle update` waere wirkungslos bei gleichzeitig erfuelltem Anschein.

**Bau-Protokoll.** Wer baut, traegt hier ein, worauf das Image steht. Der Eintrag entsteht zwangslaeufig **nach** dem Bau, den er beschreibt: `CLAUDE.md` liegt im Build-Kontext, ein Protokolleintrag aendert also den Quellstand. Der im Eintrag genannte Commit ist der, aus dem gebaut wurde, nicht der, der den Eintrag traegt.

| Tag | Digest des Images | Basis | Quellstand |
| --- | --- | --- | --- |
| `260911` | `sha256:c41609c87d83e5222825af1878d791ac1345bcb00f0c127b517debe86b03ff93` | `ruby:3.3.6@sha256:347edd0c70ee08d87de9f01b99de2f14a64cedb5d1bfb38457dfe8cd0bf113c5` | `0bebb5f` auf `feature/soyabud`, Dockerfile noch mit `bundle update`; aufgeloest: oydid 0.9.7, rails 7.2.3.2, json-ld 3.3.2, pagy 3.11.0, rbnacl 7.1.2, rdf 3.3.4, httparty 0.24.2 |
| `260911a` | `sha256:be6bc6261854b66468aa36381ae58ec51ad04c16afecb841eda5ef2a401c870b` | `ruby:3.3.6@sha256:347edd0c70ee08d87de9f01b99de2f14a64cedb5d1bfb38457dfe8cd0bf113c5` | `a763ba1` auf `feature/soyabud`, erster gepinnter Bau: Basis per Digest, kein `bundle update`, Aufloesung aus `Gemfile.lock`. Geprueft: die aus dem Image gelesene `Gemfile.lock` ist mit der versionierten identisch, 39 Tests gruen |

**Der Sprung auf `oydid` 0.9.7 ist nicht mit dem Pin gekommen, sondern vor ihm.** `oydeu/dc-eeg:260911`, das Image im Nikko-Pod, traegt 0.9.7 — hereingekommen ueber den ungepinnten Bau vom 11.09.2026, nicht ueber eine Entscheidung. Der Pin fuehrt 0.9.7 also nicht ein, er schreibt einen laufenden Zustand fest. Das ist der konkrete Vorfall, auf den CC-ADR 0015 antwortet, und der Grund, warum `bundle update` aus dem Dockerfile verschwunden ist.

Gemessen am 11.09.2026, `bundle list` im jeweiligen Image:

| Image | `oydid` | `rails` |
| --- | --- | --- |
| `oydeu/dc-base:260222` | 0.6.0 | 7.2.3 |
| `oydeu/dc-base:260911` | 0.9.7 | 7.2.3.2 |
| `oydeu/dc-eeg:260911` (Nikko) | 0.9.7 | 7.2.3.2 |

**Woher 0.6.1 kommt: es gibt zwei Abhaengigkeits-Regime.** Im Repo liegt `docker/local-gem/oydid-0.6.1.gem` (neben `semcon-0.0.2.gem`, beide vom 3. Juli). `build.sh --local` baut ueber `docker/Dockerfile-local`, und das macht `gem install /tmp/*.gem` aus genau diesem Verzeichnis. Der berichtete Pod-Stand 0.6.1 ist also keine Erfindung, sondern ein `--local`-Bau. Wer `--local` baut, umgeht die Registry und haengt an einer eingecheckten Binaerdatei; wer ohne baut, bekam bis zum Pin, was `bundle update` gerade fand. **Zwei Wege, zwei Staende, kein gemeinsamer Nenner** — das ist der Grund, warum 0.5.6, 0.6.0, 0.6.1, 0.6.5 und 0.9.7 alle gleichzeitig "richtig" sein konnten.

Der Pin greift bisher nur am ersten Weg. `Dockerfile-local` und die beiden arm-Varianten tragen weiterhin `bundle update` und ein bewegliches `FROM`; dort ist CC-ADR 0015 noch nicht umgesetzt.

**Zwei Zahlen ohne Artefakt bleiben.** `Gemfile.lock` nannte bis zum Pin 0.5.6 (Stand 3. Juli), `dc-pod/docs/Delegation-Implementation.md` nennt 0.6.5. Zu keiner der beiden existiert ein auffindbares Image oder Gem im Repo. Vor dem datierten Tag hinterliess kein Zwischenstand ein wiederfindbares Artefakt. Keine der beiden Zahlen wird uebernommen; sie bleiben als unbelegt vermerkt.

**Abnahme des `oydid`-Sprungs, 11.09.2026: bestanden.** Geprueft wurde gegen die oeffentliche VDR, je einmal im Image mit 0.9.7 und im Februar-Image `260222` mit 0.6.0, mit drei DIDs — der Nikko-DID in Kurz- und Langform und `did:oyd:zQmX493GLVxE8Wasc8ANTdZmq4YUsvdk5j6Daf7iQaPECt6`, der aeltesten produktiv genutzten Controller-DID in `pod-dpp`, registriert am 19.08.2026 und damit von einer 0.6.x geschrieben.

Ergebnis: `Oydid.read` liefert unter **beiden** Versionen fuer alle drei ein Dokument ohne Fehlertext, und `DidDocument.from_oydid` bildet es unter 0.9.7 in allen drei Faellen auf eine `verificationMethod` vom Typ `Ed25519VerificationKey2020` mit `z6Mk`-Praefix und brauchbarem 32-Byte-Schluessel ab — bei der Nikko-DID auf den erwarteten `z6MkfFirVBY3xsTndavLtxcvukuKm3F8iDwkMUqccSs8MhGQ`, bei der alten auf `z6Mkipe8M7tToZfituNY5NddD85o6xwqXdeG1S1FEZACBHYs`. 0.9.7 liest also auch Bestandsdokumente.

**`DidResolver.resolve` ist auf einem Mac unter amd64-Emulation nicht pruefbar.** Ein `Oydid.read` braucht dort 7,5 bis 15 Sekunden — unter 0.6.0 genauso wie unter 0.9.7 —, und `DidResolver::TIMEOUT` ist 5 Sekunden. Der Resolver laeuft dort also zwangslaeufig in `timeout resolving` und gibt `nil`. Das ist eine Aussage ueber die Emulation, nicht ueber die Bibliothek und nicht ueber den Resolver; das Budget bleibt, wo es ist. Wer die Resolver-Ebene wirklich messen will, misst sie im Cluster.

**Vor dem Rollout offen — nicht durchrutschen lassen.** Der Pin der Gem-Aufloesung hebt `doorkeeper` von 5.9.0 auf 5.9.7. `dc-base` haengt an zwei Doorkeeper-Erweiterungspunkten, die keine oeffentliche API sind: `grant_flows` ueber `DC_GRANT_FLOWS` und das um ein `DPoP`-Lambda erweiterte `access_token_methods`. **Die neununddreissig Tests dieses Repos fassen keinen davon an.** Ebenfalls im Pin: `connection_pool` 2.5.5 auf 3.0.2 und `erb` 4.0.4 auf 6.0.7, zwei Hauptversionsspruenge. Der `oydid`-Sprung ist abgenommen, siehe oben; diese drei sind es nicht.

Ob dieser Sprung wie der von `oydid` bereits in Betrieb ist, ist offen — fuer `oydeu/dc-eeg:260911` ist die `doorkeeper`-Version nicht erhoben. Der Nachweis sind so oder so die zweiundzwanzig Konformitaets-Vektoren in `dc-pod`, gebaut auf der neuen Basis. Pinnen und Ausrollen sind zwei Akte: der Pin stellt niemandem etwas hin, der Rollout schon, und die Vektoren laufen dazwischen. Solange diese Zeile hier steht, ist der Nachweis nicht erbracht — wer ausrollt, streicht sie oder laesst es bleiben.

**Signaturaenderungen an `Jws.verify` rollen in einer Welle mit `dc-pod`.** Ein neues `dc-base` mit einem zusaetzlichen Pflichtargument gegen ein altes `dc-pod`, das es nicht mitgibt, bricht sofort und an jeder Aufrufstelle. Erst beide Repos aendern, dann bauen, dann gemeinsam ausrollen.

**Reihenfolge beim Ausrollen:** `dc-base` muss in der Registry stehen, bevor `dc-pod` gebaut wird, und `dc-pod`, bevor ein abgeleiteter Pod gebaut wird. `buildx` zieht sein Basis-Image aus der Registry, nicht aus dem lokalen Docker-Speicher — wer nur lokal baut und dann den abgeleiteten Pod pusht, deployt stillschweigend den alten Stand.

Tests liegen unter `test/services/` mit `test/test_helper.rb` (Minitest, 39 Tests Stand 10.09.2026). **Die exakte Aufruf-Zeile**, verifiziert am 10.09.2026 mit 39 runs / 117 assertions / 0 failures:

```
docker run --rm -e RAILS_ENV=test -v ~/dev/semcon/dc-base/test:/usr/src/app/test oydeu/dc-base:latest bash -lc "bin/rails db:test:prepare && bin/rails test"
```

Beide Teile dieser Zeile sind noetig und keiner ist Kosmetik.

**`test/` steht in `.dockerignore` und liegt deshalb nicht im Image.** Ohne den `-v`-Mount meldet `bin/rails test` im Container `0 runs, 0 assertions, 0 failures` — das sieht aus wie eine gruene Suite und ist eine leere. Die Zeile in `.dockerignore` bleibt trotzdem stehen: sie haelt `test/cmd*.txt` und `test/init.txt` mit ihren echten Zugangsdaten aus allen vier abgeleiteten Images heraus. Der Mount holt das Verzeichnis aus dem Arbeitsbaum, das Image bleibt schlank.

**`db:test:prepare` vor dem Lauf**, weil die Testdatenbank im wegwerfbaren Container jedes Mal neu entsteht.

`config/environments/test.rb` steht bewusst auf `:memory_store` statt `:null_store`: sonst wäre das Vorwärmen des Resolver-Caches in den Tests ein stilles No-op. `production.rb` setzt `cache_store` explizit.

## Sicherheit

`test/cmd.txt`, `test/cmd_babelfish.txt`, `test/cmd_paging.txt` und `test/init.txt` sind persönliche Kommando-Notizen und enthalten **echte `admin`-Zugangsdaten** produktiver bzw. ehemals produktiver Pods. Sie stehen seit dem 10.09.2026 in `.gitignore`. Nimm sie nicht wieder auf, und schreib keine Zugangsdaten in neue Dateien — Verweis auf den Ablageort, nie den Wert.

**`.gitignore` allein nimmt sie nicht aus der Versionierung.** `git ls-files dc-base/test` fuehrt alle vier weiterhin auf: sie waren bereits erfasst, als die Eintraege entstanden, und ein Ignoriermuster wirkt nur auf noch nicht erfasste Pfade. Sie liegen damit weiter im Repository und in dessen Historie. Das ist am 10.09.2026 an den System-Coach eskaliert und von hier aus nicht zu loesen — weder ein `git rm --cached` noch ein Eingriff in die Historie ist eine Entscheidung dieses Repos.

`config/credentials.yml.enc` ist versioniert, `config/master.key` ist es nicht und liegt hier auch nicht vor.

## Zusammenarbeit

Dieses Repo hat **keinen eigenen Architektur-Coach**. Architektur-Entscheidungen, die über `dc-base` hinauswirken — und das tun sie hier fast alle —, gehen an den **System-Coach** (Projekt `Daten Intermediär — System`, Repo `architecture`). Du baust gegen eine Entscheidung, du triffst sie nicht.

Git: `dc-base` ist **kein eigenes Repository**, sondern ein Unterverzeichnis des Monorepos `~/dev/semcon`; das `.git` liegt eine Ebene hoeher. Git-Befehle laufen daher in `~/dev/semcon`, Pfade werden mit `dc-base/` praefixiert, und ein haengendes Lock liegt unter `~/dev/semcon/.git/index.lock`. Commit-Messages auf Englisch, ohne `Co-Authored-By`- oder Session-Trailer. Zu jedem Commit-Block lieferst du gleich die Befehle zum Bauen, Starten und Testen mit.

Antworte am Ende jeder Arbeitseinheit strukturiert unter **STAND**, **GEÄNDERTES**, **GEPRÜFTES**, **ENTSCHEIDUNGEN**, **OFFENE FRAGEN**, und gib kopierfertige Befehlsblöcke für zsh auf macOS aus — ohne `#`-Kommentare in den Befehlszeilen, mit gequoteten eckigen Klammern.
