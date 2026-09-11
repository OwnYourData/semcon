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
