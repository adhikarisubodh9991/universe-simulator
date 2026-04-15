# Universe Sandbox

Universe Sandbox is a browser-based space simulation focused on experimentation, chaos, and control. You can create planetary systems, disrupt them with extreme events, and adjust bodies in real time while the simulation is running.

This final_project build is designed to be practical to use on desktop and mobile landscape, with compact side panels, scenario shortcuts, and direct editing tools for selected bodies.

## Core Features

- N-body style gravity simulation across stars, planets, moons, asteroids, comets, fragments, and black holes.
- Tool-based interaction flow for creating and manipulating systems.
- Scenario presets for quickly testing different orbital and collision behaviors.
- Body editor panel for direct mass, radius, velocity, ring, and atmosphere adjustments.
- Snapshot-based rewind support for stepping backward through recent simulation history.
- Cosmic Events panel for high-impact disruptions.

## Tool Workflow

Use the left panel to switch tools, then interact directly with the canvas.

- Select: choose a body and open its live details/editor panel.
- Planet, Star, Black Hole: spawn by dragging to set initial velocity.
- Delete: remove a body with one click.
- Grab + Throw: reposition and release bodies with momentum.
- Laser: destroy selected targets and apply nearby shock force.

Shortcut keys 1 through 7 switch tools quickly.

## Cosmic Events

The right panel includes event controls intended for dramatic system changes.

- Meteor Storm (M): injects a dense burst of high-speed comets and asteroids into the active system.
- Gravity Pulse (G): applies a strong outward impulse to nearby bodies.
- Solar Flare (F): emits a stellar shockwave that heats and pushes nearby objects.
- Rogue Infall (R): spawns a high-mass rogue planet from deep space on an inward trajectory.

All events include layered shockwave effects so they are visible and readable immediately, even in busy systems.

Gravity Pulse behavior:
- If a body is selected, pulse origin is that selected body.
- If no body is selected, pulse origin is the system center.

Meteor Storm behavior:
- Spawns around the active system at closer range than the default comet generator.
- Uses higher initial speeds to produce immediate visible interactions.

Black hole behavior:
- Black holes use accretion visuals (disk and halo) and growth-based absorption.
- Additional pair-stabilization is applied so black holes consistently pull toward each other instead of drifting apart under event turbulence.

Solar Flare behavior:
- Uses the selected star as source when available.
- Falls back to the first active star, or creates one if no star exists.

## Scenario Presets

- Chaos Cluster: dense multi-body instability setup.
- Binary Dance: two-star system with orbiting planets.
- Impact Test: collision-focused setup.
- Ring World: ringed giant and orbital debris setup.

These scenarios are useful for testing collision handling, orbital stability, and visual effects under different load patterns.

## Selection and Editing

When a body is selected, the selection panel allows:

- Inspecting body type, mass, radius, speed, distance, moons, and temperature.
- Editing mass, radius, and velocity components.
- Enabling or disabling rings and atmosphere glow (when applicable).
- Quick actions:
  - Zero Velocity
  - Clone Body

Changes apply immediately to the running simulation.

## Mobile and Responsive Behavior

This build includes focused mobile landscape optimization:

- Compact landscape HUD profile for phones and tablets.
- Ultra-compact landscape profile for smaller devices.
- Reduced spacing, control heights, and typography to keep panels usable on narrow screens.
- Portrait rotate overlay to guide users into landscape for active interaction.
- In landscape on mobile, the first screen tap attempts fullscreen for maximum canvas space.

## Run Instructions

No build tools are required.

Option 1:
- Open index.html directly in a browser.

Option 2 (recommended for consistent behavior):
- Run a local static server.

Example:

python -m http.server 8080

Then open:

http://localhost:8080

## Current Input Reference

Camera:
- Left drag: orbit
- Right drag: pan
- Mouse wheel or pinch: zoom

Tools:
- 1: Select
- 2: Spawn Planet
- 3: Spawn Star
- 4: Spawn Black Hole
- 5: Delete
- 6: Grab + Throw
- 7: Laser

Events:
- M: Meteor Storm
- G: Gravity Pulse
- F: Solar Flare
- R: Rogue Infall

## Performance Notes

- Simulation behavior is tuned for interactive sandbox play, not strict astrophysics accuracy.
- Very high body counts and repeated event triggers can reduce frame rate on low-power devices.
- Rewind history is snapshot-based and intentionally limited to keep runtime memory predictable.

## Project Files

- index.html: UI structure and panel layout.
- styles.css: visual system and responsive behavior.
- script.js: simulation, controls, events, and runtime loop.
- DEVLOG.md: chronological change history for final_project.
