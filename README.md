# space^.go — NASA Space Flight & Planetary Mission Simulator

An interactive web application and flight dynamics simulator built for the NASA Space Apps Challenge. Design real-world space missions, configure advanced propulsion systems, launch heavy-lift rockets into orbit, command Mars rover expeditions, and mine deep space asteroids — with zero external dependencies!

---

## Highlights

- **Vehicle Assembly Building (VAB):**
  - Choose from standard launch vehicles: NASA SLS, Saturn V, Starship & Super Heavy, and Falcon 9.
  - **Custom Rocket Upload:** Drag and drop any custom rocket artwork or image to fly it directly on the physics canvas.

- **Orbital Mechanics & Staging:**
  - Real-time gravity turns, atmospheric drag, dynamic pressure (Max-Q), and Mach 1 shockwave visualization.
  - Sequential staging with side booster decoupling (via `Spacebar` or on-screen uplink command).

- **Mars Gale Crater Curiosity Rover Expedition:**
  - Drive across Martian regolith with authentic sand tracks matching rover tread geometry.
  - Survey and drill all 12 authenticated geological sites across the crater floor.
  - Full iPad / tablet touch support (on-screen D-Pad and canvas tap-to-drive).

- **Deep Space Asteroid Mining:**
  - Rendezvous with high-value celestial bodies (e.g. 16 Psyche, Bennu, Ceres) and deploy automated sampling probes.

- **NASA Virtual Bank & Upgrade Shop:**
  - Earn NASA mission points and grant funds to unlock aerodynamic stabilizers and vehicle upgrades.

- **Built-in Synthesized Web Audio:**
  - Low-latency synthesized rocket rumble, staging separation pyrotechnics, and orbital fanfare without external audio assets.

---

## Running Locally

Open `index.html` in any modern web browser, or serve the directory using a lightweight HTTP server:

```bash
# Using Python
python3 -m http.server 8080

# Using Ruby
ruby server.rb
```

Then visit `http://localhost:8080` (or `http://<your-lan-ip>:8080` from mobile devices on the same local network).

---

## Publishing to GitHub Pages (1-Click Hosting)

1. Create a new repository on [GitHub](https://github.com/new).
2. Upload the project files (`index.html`, `style.css`, `js/`, etc.).
3. In your repository, navigate to **Settings** > **Pages**.
4. Under **Branch**, select `main` (or `master`) and folder `/ (root)`, then click **Save**.
5. GitHub will provide a live public URL (e.g., `https://<username>.github.io/<repo-name>/`) where anyone can play directly in their browser or mobile device!

---

## Flight Controls

| Platform | Control | Action |
|---|---|---|
| **Keyboard** | `Spacebar` | Fire Stage 1 Booster Separation / Deploy Rover Drill |
| **Keyboard** | `Arrow Left` / `Arrow Right` | Adjust rocket pitch angle (Gravity Turn) |
| **Keyboard** | `Arrow Up` / `Arrow Down` | Throttle up / down (0% – 100%) |
| **Keyboard** | `R` | Dispatch Rover / Mars Descent Capsule |
| **Keyboard** | `M` | Toggle synthesized audio mute |
| **iPad / Touch** | On-screen D-Pad (`▲` `◀` `▶` `▼`) | Rover steering and propulsion |
| **iPad / Touch** | Canvas Tap | Autopilot drive directly to clicked coordinate |
| **iPad / Touch** | `🔬 DRILL` Button | Percussion drill sampling on target sites |

