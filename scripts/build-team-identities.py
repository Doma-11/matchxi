#!/usr/bin/env python3
"""Rebuild the small, static identity registry from checked-in supported team data.

No HTTP calls. Update app/team-aliases.json for newly verified source spellings,
then run this script and the identity tests before deploying.
"""
import json, pathlib, re, unicodedata
ROOT = pathlib.Path(__file__).resolve().parent.parent
def read(path): return json.loads((ROOT / path).read_text())
def norm(value):
    value = ''.join(c for c in unicodedata.normalize('NFD', value) if not unicodedata.combining(c)).lower()
    return re.sub(r'[^a-z0-9]+', ' ', value).strip()
aliases = read('app/team-aliases.json')
canonical = {norm(name): name for name in aliases}
alias_index = {}
for name, variants in aliases.items():
    for variant in [name, *variants]: alias_index.setdefault(norm(variant), set()).add(name)
records = {}
def add(team, league, kind):
    raw = team.get('name')
    if not raw: return
    candidates = alias_index.get(norm(raw), set())
    name = canonical.get(norm(raw)) or (next(iter(candidates)) if len(candidates) == 1 else raw)
    key = kind + ':' + norm(name).replace(' ', '-')
    record = records.setdefault(key, dict(id=key, name=name, kind=kind, leagues=set(), aliases=set()))
    record['leagues'].add(league)
    record['aliases'].update([name, raw, *aliases.get(name, [])])
    if len(team.get('short', '')) > 2: record['aliases'].add(team['short'])
    # Standard club designators only. Keep United, City, ages, B/II and women's
    # markers intact; index collisions are rejected at runtime.
    for variant in [name, raw]:
        shortened = re.sub(r'^(?:1\.\s*)?(?:FC|AFC|SC|CF|FK|SK|AC|AS|HNK|NK|GNK|RCD|CA)\s+', '', variant, flags=re.I)
        shortened = re.sub(r'\s+(?:FC|AFC|SC|CF|FK|SK|AC|HNK|NK)$', '', shortened, flags=re.I)
        if len(norm(shortened)) >= 3: record['aliases'].add(shortened)
for league, teams in read('public/data/clubs.json').items():
    for team in teams: add(team, league, 'club')
for league, teams in read('public/data/national-teams.json').items():
    for team in teams: add(team, league, 'national')
for league, dashboard in read('public/data/league-dashboards.json').items():
    for row in dashboard.get('table', []):
        add(dict(row.get('club', {}), name=row['name']), league, 'club')
supported = set(read('public/data/clubs.json')) | set(read('public/data/national-teams.json')) | {'uefa.champions', 'uefa.europa', 'uefa.europa.conf'}
for game in read('public/data/catalogue-seed.json').get('game', []):
    if game.get('league') not in supported: continue
    for side in ['home', 'away']:
        add(game[side], game['league'], 'national' if game['league'] in {'uefa.nations', 'fifa.world', 'uefa.euro'} else 'club')
for record in records.values():
    record['leagues'] = sorted(record['leagues'])
    record['aliases'] = sorted(record['aliases'])
output = sorted(records.values(), key=lambda r: r['id'])
(ROOT / 'app/team-identities.json').write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n')
print(f"Registered {sum(r['kind']=='club' for r in output)} clubs and {sum(r['kind']=='national' for r in output)} national teams")
