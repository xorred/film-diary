# Films that need a look

Generated 2026-10-23 18:22 UTC by `npm run enrich`.

To fix one, find the film on themoviedb.org. The number in its URL is the id
(themoviedb.org/movie/**12345**-name). Add it to `data/overrides.json`, then run `npm run enrich` again.
For a TV series (themoviedb.org/tv/12345-name) write it as "tv:12345".

```json
{ "Some Film (2011)": 12345, "Some Series (2021)": "tv:67890" }
```

## Not matched (0)

None. Everything matched.


## Matched loosely, worth a quick check (11)

These matched with a year a little off, on title alone, or as a TV series. They are probably right.

- Squid Game (2021) -> Squid Game (2021), Hwang Dong-hyuk, id 93405 [tv-series]
- Moon Knight (2022) -> Moon Knight (2022), Jeremy Slater, id 92749 [tv-series]
- The Falcon and the Winter Soldier (2021) -> The Falcon and the Winter Soldier (2021), Malcolm Spellman, id 88396 [tv-series]
- The Man Who Feels No Pain (2018) -> The Man Who Feels No Pain (2019), Vasan Bala, id 541495 [title+nearby-year]
- WandaVision (2021) -> WandaVision (2021), Jac Schaeffer, id 85271 [tv-series]
- Loki (2021) -> Loki (2021), Michael Waldron, id 84958 [tv-series]
- Hawkeye (2021) -> Hawkeye (2021), Jonathan Igla, id 88329 [tv-series]
- Filmistaan (2012) -> Filmistaan (2014), Nitin Kakkar, id 161064 [title-only]
- Special Ops 1.5 The Himmat Story (2021) -> Special Ops 1.5 The Himmat Story (2021), director unknown, id 138396 [tv-series]
- Scam 1992: The Harshad Mehta Story (2020) -> Scam 1992: The Harshad Mehta Story (2020), Hansal Mehta, id 111188 [tv-series]
- The Raid (2011) -> The Raid (2012), Gareth Evans, id 94329 [title+nearby-year]
