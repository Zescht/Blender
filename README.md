# Blender Draft Simulator

Simulate agent compositions for the [Project Blender](https://www.project-blender.com/en/faq) Valorant tournament's "Blender Draft".

Rules enforced per team across a best-of-3:

- **Team A**: its Map 1 comp is banned for Team A on Map 2 and Map 3.
- **Team B**: its Map 1 comp is banned for Team B on Map 2; its Map 2 comp is banned for Team B on Map 3.

## Run

It's a static site, so any local server works:

```
python -m http.server 8080
```

Then open http://127.0.0.1:8080.

Agent, role and map images come from [valorant-api.com](https://valorant-api.com). Valorant and all related assets are property of Riot Games.
