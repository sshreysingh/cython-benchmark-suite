// ==========================================================================
// CPython vs. Cython Interactive Benchmark & Telemetry Terminal Engine
// Utilitarian Native Unix / Hacker Dashboard Driver (Fault-Tolerant & Bulletproof)
// ==========================================================================

let currentAlgo = "dijkstra";
let currentGrid = null;
let currentSeed = 42;
let animTimer = null;
let charts = {};
let suiteDataCache = null;
window.__appInitialized = false;

// Helper: safe DOM getter
function $(id) {
    return document.getElementById(id);
}

// Global actions exposed on window for direct HTML onclick execution
window.selectTab = selectTab;
window.setAlgorithm = setAlgorithm;
window.runBenchmark = runBenchmark;
window.reseedTerrain = reseedTerrain;
window.stepGridSize = stepGridSize;
window.stepDensity = stepDensity;
window.stepNQueens = stepNQueens;
window.setTheme = setTheme;
window.toggleCrt = toggleCrt;
window.toggleHelp = toggleHelp;
window.loadBenchmarkSuite = loadBenchmarkSuite;
window.exportJsonFile = exportJsonFile;
window.exportCsvFile = exportCsvFile;
window.clearLog = clearLog;
window.copyCliCommand = copyCliCommand;
window.switchCodeAlgo = switchCodeAlgo;
window.handleGridSizeInput = handleGridSizeInput;
window.handleDensityInput = handleDensityInput;
window.handleNQueensInput = handleNQueensInput;
window.loadGrid = loadGrid;

// Safe Application Initialization
function initApp() {
    if (window.__appInitialized) return;
    window.__appInitialized = true;

    try { startClock(); } catch (e) { console.warn("Clock init err", e); }
    try { setupTabs(); } catch (e) { console.warn("Tabs init err", e); }
    try { setupControls(); } catch (e) { console.warn("Controls init err", e); }
    try { setupThemeAndCrt(); } catch (e) { console.warn("Theme init err", e); }
    try { setupKeyboardHotkeys(); } catch (e) { console.warn("Hotkeys init err", e); }
    try { setupCodeInspector(); } catch (e) { console.warn("Code inspector init err", e); }
    try { setupExportButtons(); } catch (e) { console.warn("Export buttons init err", e); }
    try { updateCliPreview(); } catch (e) { console.warn("CLI preview init err", e); }
    try { loadGrid(); } catch (e) { console.warn("Load grid init err", e); }

    addLog("Terminal session initialized. Ready for benchmark dispatch.", "ready");
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}
window.addEventListener("load", () => {
    if (!window.__appInitialized) initApp();
});

// Real-time terminal clock
function startClock() {
    const el = $("clock-display");
    function tick() {
        const d = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        if (el) {
            el.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        }
    }
    tick();
    setInterval(tick, 1000);
}

// Log line to terminal execution stream
function addLog(msg, type = "sys") {
    const termLog = $("term-log");
    if (!termLog) return;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const ms = String(now.getMilliseconds()).padStart(3, "0");
    const timeStr = `[${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${ms}]`;

    const line = document.createElement("div");
    line.className = "log-line";

    let typeClass = "log-sys";
    let prefix = "sys:";
    if (type === "ready") { typeClass = "log-ready"; prefix = "ok:"; }
    else if (type === "perf") { typeClass = "log-perf"; prefix = "tele:"; }
    else if (type === "warn") { typeClass = "log-ts"; prefix = "warn:"; }

    line.innerHTML = `<span class="log-ts">${timeStr}</span> <span class="${typeClass}">${prefix}</span> ${escapeHtml(msg)}`;
    termLog.appendChild(line);
    termLog.scrollTop = termLog.scrollHeight;
}

function clearLog() {
    const termLog = $("term-log");
    if (termLog) {
        termLog.innerHTML = "";
        addLog("Execution stream cleared.", "sys");
    }
}

function escapeHtml(str) {
    return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Tab Switching
function selectTab(targetId) {
    if (!targetId) return;
    const tabs = document.querySelectorAll(".nav-btn");
    tabs.forEach(t => {
        if (t.getAttribute("data-tab") === targetId || t.id === `btn-tab-${targetId.replace("-tab", "")}`) {
            t.classList.add("active");
        } else {
            t.classList.remove("active");
        }
    });

    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    const targetContent = $(targetId);
    if (targetContent) {
        targetContent.classList.add("active");
    }

    if (targetId === "matrix-tab" && !charts.nqueens) {
        loadBenchmarkSuite();
    }

    addLog(`Switched active terminal buffer to ${targetId.replace("-tab", "").toUpperCase()}`, "sys");
}

function setupTabs() {
    const tabs = document.querySelectorAll(".nav-btn");
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            selectTab(tab.getAttribute("data-tab"));
        });
    });
}

// Algorithm Selection
function setAlgorithm(algo) {
    currentAlgo = algo;
    document.querySelectorAll(".algo-choice").forEach(b => {
        if (b.getAttribute("data-algo") === algo) {
            b.classList.add("active");
        } else {
            b.classList.remove("active");
        }
    });
    handleAlgoSwitch(algo);
    updateCliPreview();
}

function handleAlgoSwitch(algo) {
    if (animTimer) cancelAnimationFrame(animTimer);

    const gridControls = $("grid-controls");
    const nqueensControls = $("nqueens-controls");
    const canvas = $("main-canvas");
    const chessboardContainer = $("chessboard-container");
    const gridLegend = $("grid-legend");
    const canvasHeading = $("canvas-heading");
    const labelStatExtra = $("label-stat-extra");
    const subStatExtra = $("sub-stat-extra");
    const statusCurrentAlgo = $("status-current-algo");
    const statusCurrentGrid = $("status-current-grid");
    const canvasDimBadge = $("canvas-dim-badge");
    const teleAlgo = $("tele-algo");
    const heuristicGroup = $("heuristic-group");
    const nqueensSlider = $("nqueens-slider");
    const gridSizeSlider = $("grid-size-slider");

    if (algo === "nqueens") {
        if (gridControls) gridControls.style.display = "none";
        if (nqueensControls) nqueensControls.style.display = "block";
        if (canvas) canvas.style.display = "none";
        if (chessboardContainer) chessboardContainer.style.display = "grid";
        if (gridLegend) gridLegend.style.display = "none";
        if (canvasHeading) canvasHeading.textContent = "N-Queens Chessboard Conflict-Free Solution Matrix";
        if (labelStatExtra) labelStatExtra.textContent = "SOLUTIONS";
        if (subStatExtra) subStatExtra.textContent = "Distinct legal placements found";
        if (statusCurrentAlgo) statusCurrentAlgo.textContent = "ALGO: N-QUEENS (BITMASK)";
        const nVal = nqueensSlider ? nqueensSlider.value : 12;
        if (statusCurrentGrid) statusCurrentGrid.textContent = `BOARD: ${nVal}x${nVal}`;
        if (canvasDimBadge) canvasDimBadge.textContent = `[${nVal} x ${nVal}]`;
        if (teleAlgo) teleAlgo.textContent = "Bitmask Backtracking (with nogil)";
        renderEmptyChessboard(parseInt(nVal));
        addLog(`Algorithm switched to N-Queens (N=${nVal})`, "sys");
    } else {
        if (gridControls) gridControls.style.display = "block";
        if (nqueensControls) nqueensControls.style.display = "none";
        if (canvas) canvas.style.display = "block";
        if (chessboardContainer) chessboardContainer.style.display = "none";
        if (gridLegend) gridLegend.style.display = "flex";
        if (labelStatExtra) labelStatExtra.textContent = "TELEMETRY";
        if (subStatExtra) subStatExtra.textContent = "Nodes visited / path cost";
        const szVal = gridSizeSlider ? gridSizeSlider.value : 40;
        if (statusCurrentGrid) statusCurrentGrid.textContent = `GRID: ${szVal}x${szVal} (${szVal * szVal} cells)`;
        if (canvasDimBadge) canvasDimBadge.textContent = `[${szVal} x ${szVal}]`;

        if (algo === "astar") {
            if (heuristicGroup) heuristicGroup.style.display = "flex";
            if (canvasHeading) canvasHeading.textContent = "A* Search: Heuristic Guided Exploration Wave";
            if (statusCurrentAlgo) statusCurrentAlgo.textContent = "ALGO: A* SEARCH (F=G+H)";
            if (teleAlgo) teleAlgo.textContent = "A* Min-Heap + Inlined Distance Metric";
            addLog("Algorithm switched to A* Heuristic Search", "sys");
        } else {
            if (heuristicGroup) heuristicGroup.style.display = "none";
            if (canvasHeading) canvasHeading.textContent = "Dijkstra: Uniform Cost Exploration Wave";
            if (statusCurrentAlgo) statusCurrentAlgo.textContent = "ALGO: DIJKSTRA (UNIFORM COST)";
            if (teleAlgo) teleAlgo.textContent = "Dijkstra Priority Min-Heap";
            addLog("Algorithm switched to Dijkstra Shortest Path", "sys");
        }
        drawGrid(currentGrid);
    }
}

// Steppers and Inputs
function stepGridSize(delta) {
    const slider = $("grid-size-slider");
    if (!slider) return;
    const newVal = Math.max(20, Math.min(80, parseInt(slider.value) + delta));
    slider.value = newVal;
    handleGridSizeInput(newVal);
    loadGrid();
}

function handleGridSizeInput(val) {
    const gridSizeVal = $("grid-size-val");
    const canvasDimBadge = $("canvas-dim-badge");
    const statusCurrentGrid = $("status-current-grid");
    if (gridSizeVal) gridSizeVal.textContent = `${val} x ${val}`;
    if (canvasDimBadge) canvasDimBadge.textContent = `[${val} x ${val}]`;
    if (statusCurrentGrid) statusCurrentGrid.textContent = `GRID: ${val}x${val} (${val * val} cells)`;
    updateRulers(parseInt(val));
    updateCliPreview();
}

function stepDensity(delta) {
    const slider = $("density-slider");
    if (!slider) return;
    const newVal = Math.max(5, Math.min(35, parseInt(slider.value) + delta));
    slider.value = newVal;
    handleDensityInput(newVal);
    loadGrid();
}

function handleDensityInput(val) {
    const densityVal = $("density-val");
    if (densityVal) densityVal.textContent = `${val}%`;
    updateCliPreview();
}

function stepNQueens(delta) {
    const slider = $("nqueens-slider");
    if (!slider) return;
    const newVal = Math.max(8, Math.min(14, parseInt(slider.value) + delta));
    slider.value = newVal;
    handleNQueensInput(newVal);
}

function handleNQueensInput(val) {
    const nqueensVal = $("nqueens-val");
    const statusCurrentGrid = $("status-current-grid");
    const canvasDimBadge = $("canvas-dim-badge");
    if (nqueensVal) nqueensVal.textContent = val;
    if (statusCurrentGrid) statusCurrentGrid.textContent = `BOARD: ${val}x${val} (${val} Queens)`;
    if (canvasDimBadge) canvasDimBadge.textContent = `[${val} x ${val}]`;
    updateCliPreview();
    renderEmptyChessboard(parseInt(val));
}

function reseedTerrain() {
    currentSeed = Math.floor(Math.random() * 100000);
    const seedVal = $("seed-val");
    if (seedVal) seedVal.textContent = `0x${currentSeed.toString(16).toUpperCase().padStart(4, "0")} (${currentSeed})`;
    updateCliPreview();
    loadGrid();
    addLog(`Re-seeded pseudo-random terrain generator with seed: ${currentSeed}`, "sys");
}

function updateRulers(dim) {
    const rulerH = $("ruler-h");
    const rulerV = $("ruler-v");
    if (!rulerH || !rulerV) return;

    const step = Math.max(5, Math.floor(dim / 4));
    let marks = [];
    for (let i = 0; i <= dim; i += step) {
        marks.push(String(i).padStart(2, "0"));
    }
    if (marks[marks.length - 1] !== String(dim)) {
        marks.push(String(dim));
    }

    rulerH.innerHTML = marks.map(m => `<span>${m}</span>`).join("");
    rulerV.innerHTML = marks.map(m => `<span>${m}</span>`).join("");
}

function updateCliPreview() {
    const preview = $("cli-cmd-preview");
    if (!preview) return;
    const nVal = $("nqueens-slider") ? $("nqueens-slider").value : 12;
    const sz = $("grid-size-slider") ? $("grid-size-slider").value : 40;
    const densVal = $("density-slider") ? $("density-slider").value : 22;
    const dens = (parseInt(densVal) / 100).toFixed(2);
    const heur = $("heuristic-select") ? $("heuristic-select").value : "manhattan";

    if (currentAlgo === "nqueens") {
        preview.textContent = `./run.sh benchmark --algo=nqueens --n=${nVal}`;
    } else if (currentAlgo === "astar") {
        preview.textContent = `./run.sh benchmark --algo=astar --grid=${sz}x${sz} --density=${dens} --heuristic=${heur} --seed=${currentSeed}`;
    } else {
        preview.textContent = `./run.sh benchmark --algo=dijkstra --grid=${sz}x${sz} --density=${dens} --seed=${currentSeed}`;
    }
}

function copyCliCommand() {
    const preview = $("cli-cmd-preview");
    const btn = $("btn-copy-cli");
    if (!preview) return;
    const cmd = preview.textContent;
    navigator.clipboard.writeText(cmd).then(() => {
        if (btn) {
            const orig = btn.textContent;
            btn.textContent = "COPIED!";
            setTimeout(() => { btn.textContent = orig; }, 1200);
        }
        addLog(`Copied CLI invocation: "${cmd}" to clipboard`, "sys");
    }).catch(() => {
        addLog(`CLI command: ${cmd}`, "sys");
    });
}

function setupControls() {
    const gridSizeSlider = $("grid-size-slider");
    if (gridSizeSlider) {
        gridSizeSlider.addEventListener("input", (e) => handleGridSizeInput(e.target.value));
        gridSizeSlider.addEventListener("change", () => loadGrid());
    }

    const densitySlider = $("density-slider");
    if (densitySlider) {
        densitySlider.addEventListener("input", (e) => handleDensityInput(e.target.value));
        densitySlider.addEventListener("change", () => loadGrid());
    }

    const nqueensSlider = $("nqueens-slider");
    if (nqueensSlider) {
        nqueensSlider.addEventListener("input", (e) => handleNQueensInput(e.target.value));
    }

    const heuristicSelect = $("heuristic-select");
    if (heuristicSelect) {
        heuristicSelect.addEventListener("change", () => updateCliPreview());
    }

    const btnRun = $("btn-run-benchmark");
    if (btnRun) {
        btnRun.addEventListener("click", () => runBenchmark());
    }

    const btnRegen = $("btn-regen-grid");
    if (btnRegen) {
        btnRegen.addEventListener("click", () => reseedTerrain());
    }

    const btnClearLog = $("btn-clear-log");
    if (btnClearLog) {
        btnClearLog.addEventListener("click", () => clearLog());
    }

    const btnCopyCli = $("btn-copy-cli");
    if (btnCopyCli) {
        btnCopyCli.addEventListener("click", () => copyCliCommand());
    }
}

// Theme & CRT Handling
function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.querySelectorAll(".term-theme-btn").forEach(b => {
        if (b.getAttribute("data-settheme") === theme) {
            b.classList.add("active");
        } else {
            b.classList.remove("active");
        }
    });
    addLog(`Color palette switched to [${theme.toUpperCase()}] mode`, "sys");

    if (charts.nqueens) {
        loadBenchmarkSuite();
    }
}

function toggleCrt() {
    const isEnabled = document.body.classList.toggle("crt-enabled");
    const crtStatusText = $("crt-status-text");
    if (crtStatusText) crtStatusText.textContent = isEnabled ? "ON" : "OFF";
    addLog(`CRT scanline raster filter toggled ${isEnabled ? "ON" : "OFF"}`, "sys");
}

function toggleHelp(show) {
    const helpModal = $("help-modal");
    if (!helpModal) return;
    if (typeof show === "boolean") {
        if (show) helpModal.classList.add("open");
        else helpModal.classList.remove("open");
    } else {
        helpModal.classList.toggle("open");
    }
}

function setupThemeAndCrt() {
    const crtBtn = $("btn-toggle-crt");
    if (crtBtn) crtBtn.addEventListener("click", () => toggleCrt());

    document.querySelectorAll(".term-theme-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const theme = btn.getAttribute("data-settheme");
            setTheme(theme);
        });
    });

    const helpModal = $("help-modal");
    if (helpModal) {
        helpModal.addEventListener("click", (e) => {
            if (e.target === helpModal) toggleHelp(false);
        });
    }
}

// Keyboard shortcuts
function setupKeyboardHotkeys() {
    window.addEventListener("keydown", (e) => {
        if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) return;

        const key = e.key.toUpperCase();
        if (key === " " || key === "ENTER") {
            e.preventDefault();
            runBenchmark();
        } else if (key === "1") {
            selectTab("visualizer-tab");
        } else if (key === "2") {
            selectTab("matrix-tab");
        } else if (key === "3") {
            selectTab("code-tab");
        } else if (key === "D") {
            setAlgorithm("dijkstra");
        } else if (key === "A") {
            setAlgorithm("astar");
        } else if (key === "Q") {
            setAlgorithm("nqueens");
        } else if (key === "G") {
            reseedTerrain();
        } else if (key === "C") {
            toggleCrt();
        } else if (key === "T") {
            cycleTheme();
        } else if (key === "?" || key === "/") {
            toggleHelp();
        } else if (key === "ESCAPE") {
            toggleHelp(false);
        }
    });
}

function cycleTheme() {
    const themes = ["cyber", "phosphor", "amber"];
    const current = document.documentElement.getAttribute("data-theme") || "cyber";
    const nextIdx = (themes.indexOf(current) + 1) % themes.length;
    setTheme(themes[nextIdx]);
}

// Fetch grid from server
async function loadGrid() {
    const gridSizeSlider = $("grid-size-slider");
    const densitySlider = $("density-slider");
    const size = gridSizeSlider ? parseInt(gridSizeSlider.value) : 40;
    const density = densitySlider ? parseInt(densitySlider.value) / 100.0 : 0.22;

    try {
        const res = await fetch(`/api/grid?rows=${size}&cols=${size}&density=${density}&seed=${currentSeed}`);
        currentGrid = await res.json();
        updateRulers(size);
        if (currentAlgo !== "nqueens") {
            drawGrid(currentGrid);
        }
        addLog(`Terrain allocated: ${size}x${size} matrix (${(density * 100).toFixed(0)}% wall obstacles)`, "sys");
    } catch (err) {
        console.error("Failed to load grid", err);
        addLog(`ERR: Failed to initialize grid buffer: ${err.message}`, "warn");
    }
}

// Draw static grid with terminal styling
function drawGrid(gridData, explored = [], path = []) {
    const canvas = $("main-canvas");
    if (!canvas || !gridData) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { rows, cols, grid, start, goal } = gridData;
    if (!grid || !start || !goal) return;

    const size = 580;
    canvas.width = size;
    canvas.height = size;
    const cellW = size / cols;
    const cellH = size / rows;

    ctx.fillStyle = "#07090e";
    ctx.fillRect(0, 0, size, size);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const val = grid[r][c];
            const x = c * cellW;
            const y = r * cellH;

            if (val < 0) {
                ctx.fillStyle = "#161d2b";
                ctx.fillRect(x, y, cellW, cellH);
                ctx.strokeStyle = "#253147";
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, cellW, cellH);

                if (cellW >= 12) {
                    ctx.fillStyle = "#2d3a54";
                    ctx.font = `${Math.floor(cellW * 0.7)}px monospace`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText("#", x + cellW / 2, y + cellH / 2);
                }
            } else if (val > 0) {
                const intensity = Math.min(val / 5.0, 1.0);
                ctx.fillStyle = `rgba(180, 83, 9, ${0.25 + intensity * 0.5})`;
                ctx.fillRect(x, y, cellW, cellH);
                ctx.strokeStyle = "rgba(245, 158, 11, 0.2)";
                ctx.strokeRect(x, y, cellW, cellH);
            } else {
                ctx.fillStyle = "#090d16";
                ctx.fillRect(x, y, cellW, cellH);
                ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
                ctx.strokeRect(x, y, cellW, cellH);
            }
        }
    }

    if (explored && explored.length > 0) {
        ctx.fillStyle = "rgba(0, 229, 255, 0.4)";
        for (const [er, ec] of explored) {
            ctx.fillRect(ec * cellW, er * cellH, cellW, cellH);
        }
    }

    if (path && path.length > 0) {
        ctx.fillStyle = "#ffb800";
        for (const [pr, pc] of path) {
            ctx.fillRect(pc * cellW, pr * cellH, cellW, cellH);
        }

        ctx.strokeStyle = "#ff9900";
        ctx.lineWidth = Math.max(2, cellW * 0.4);
        ctx.lineJoin = "round";
        ctx.beginPath();
        for (let i = 0; i < path.length; i++) {
            const [pr, pc] = path[i];
            const cx = pc * cellW + cellW / 2;
            const cy = pr * cellH + cellH / 2;
            if (i === 0) ctx.moveTo(cx, cy);
            else ctx.lineTo(cx, cy);
        }
        ctx.stroke();
    }

    const sx = start[1] * cellW;
    const sy = start[0] * cellH;
    ctx.fillStyle = "#00ff66";
    ctx.shadowColor = "#00ff66";
    ctx.shadowBlur = 10;
    ctx.fillRect(sx, sy, cellW, cellH);
    ctx.shadowBlur = 0;

    if (cellW >= 10) {
        ctx.fillStyle = "#000000";
        ctx.font = `bold ${Math.max(8, Math.floor(cellW * 0.7))}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("S", sx + cellW / 2, sy + cellH / 2);
    }

    const gx = goal[1] * cellW;
    const gy = goal[0] * cellH;
    ctx.fillStyle = "#ff3366";
    ctx.shadowColor = "#ff3366";
    ctx.shadowBlur = 10;
    ctx.fillRect(gx, gy, cellW, cellH);
    ctx.shadowBlur = 0;

    if (cellW >= 10) {
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${Math.max(8, Math.floor(cellW * 0.7))}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("G", gx + cellW / 2, gy + cellH / 2);
    }
}

function animateExploration(gridData, exploredOrder, finalPath) {
    if (animTimer) cancelAnimationFrame(animTimer);

    const safeExplored = exploredOrder || [];
    const safePath = finalPath || [];
    const totalSteps = safeExplored.length;
    let step = 0;
    const batchSize = Math.max(1, Math.floor(totalSteps / 45));

    function stepFrame() {
        step = Math.min(step + batchSize, totalSteps);
        const currentExplored = safeExplored.slice(0, step);
        const currentPath = step >= totalSteps ? safePath : [];

        drawGrid(gridData, currentExplored, currentPath);

        if (step < totalSteps) {
            animTimer = requestAnimationFrame(stepFrame);
        }
    }

    stepFrame();
}

function renderEmptyChessboard(n) {
    const chessboardContainer = $("chessboard-container");
    if (!chessboardContainer) return;
    chessboardContainer.innerHTML = "";
    chessboardContainer.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
    chessboardContainer.style.gridTemplateRows = `repeat(${n}, 1fr)`;

    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            const cell = document.createElement("div");
            cell.className = `chess-cell ${(r + c) % 2 === 0 ? "chess-light" : "chess-dark"}`;
            cell.dataset.r = r;
            cell.dataset.c = c;
            chessboardContainer.appendChild(cell);
        }
    }
}

function renderQueensPlacement(placement) {
    const chessboardContainer = $("chessboard-container");
    if (!chessboardContainer || !placement) return;
    const n = placement.length;
    renderEmptyChessboard(n);

    for (let r = 0; r < n; r++) {
        const c = placement[r];
        if (c >= 0) {
            const idx = r * n + c;
            const cell = chessboardContainer.children[idx];
            if (cell) {
                cell.innerHTML = `<span class="chess-queen">&#9813;</span>`;
            }
        }
    }
}

function makeAsciiMeter(ratio, max = 20) {
    const safeRatio = isNaN(ratio) ? 0 : Math.max(0, Math.min(1.0, ratio));
    const filled = Math.round(safeRatio * max);
    const empty = max - filled;
    return `[${"█".repeat(filled)}${"░".repeat(Math.max(0, empty))}]`;
}

// Benchmark execution
async function runBenchmark() {
    const btn = $("btn-run-benchmark");
    const termStatusMsg = $("term-status-msg");
    const valPyTime = $("val-py-time");
    const valCyTime = $("val-cy-time");
    const valSpeedup = $("val-speedup");
    const subSpeedup = $("sub-speedup");
    const valStatExtra = $("val-stat-extra");
    const subStatExtra = $("sub-stat-extra");
    const meterPy = $("meter-py");
    const meterCy = $("meter-cy");
    const meterAcc = $("meter-acc");
    const meterEff = $("meter-eff");

    if (btn) {
        btn.disabled = true;
        btn.style.opacity = "0.7";
    }
    if (termStatusMsg) {
        termStatusMsg.textContent = "STATUS: EXECUTING...";
        termStatusMsg.style.color = "var(--term-amber)";
    }

    const nVal = $("nqueens-slider") ? parseInt($("nqueens-slider").value) : 12;
    const rVal = $("grid-size-slider") ? parseInt($("grid-size-slider").value) : 40;
    const dVal = $("density-slider") ? parseInt($("density-slider").value) / 100.0 : 0.22;
    const hVal = $("heuristic-select") ? $("heuristic-select").value : "manhattan";

    const payload = {
        algorithm: currentAlgo,
        n: nVal,
        rows: rVal,
        cols: rVal,
        density: dVal,
        seed: currentSeed,
        heuristic: hVal
    };

    addLog(`Dispatching benchmark job: ${currentAlgo.toUpperCase()} (Payload: ${JSON.stringify(payload)})`, "sys");

    try {
        const res = await fetch("/api/benchmark", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (valPyTime) valPyTime.innerHTML = `${data.python_time_ms} <span class="unit">ms</span>`;
        if (valCyTime) valCyTime.innerHTML = `${data.cython_time_ms} <span class="unit">ms</span>`;
        if (valSpeedup) valSpeedup.innerHTML = `${data.speedup} <span class="unit">x</span>`;
        if (subSpeedup) subSpeedup.textContent = `Cython is ${data.speedup}x faster than CPython`;

        const maxTime = Math.max(data.python_time_ms || 0.001, data.cython_time_ms || 0.001, 0.001);
        if (meterPy) meterPy.textContent = makeAsciiMeter((data.python_time_ms || 0) / maxTime);
        if (meterCy) meterCy.textContent = makeAsciiMeter((data.cython_time_ms || 0) / maxTime);
        if (meterAcc) meterAcc.textContent = makeAsciiMeter(Math.min((data.speedup || 1) / 50.0, 1.0));

        if (currentAlgo === "nqueens") {
            if (valStatExtra) valStatExtra.textContent = (data.solutions || 0).toLocaleString();
            if (meterEff) meterEff.textContent = `[SOL: ${data.solutions}]`;
            renderQueensPlacement(data.placement);
            addLog(`CPython: ${data.python_time_ms}ms | Cython: ${data.cython_time_ms}ms | Acceleration: ${data.speedup}x`, "perf");
            addLog(`N-Queens (N=${payload.n}) completed. Placements searched: ${(data.solutions || 0).toLocaleString()}`, "ready");
        } else {
            const visited = data.visited_count || 0;
            const totalCells = payload.rows * payload.cols;
            if (valStatExtra) valStatExtra.textContent = `${visited} / ${totalCells}`;
            const coverage = ((visited / totalCells) * 100).toFixed(1);
            const pathLen = (data.path || []).length;
            if (subStatExtra) subStatExtra.textContent = `Nodes visited (${coverage}% coverage) | Path: ${pathLen} steps`;
            if (meterEff) meterEff.textContent = makeAsciiMeter(visited / totalCells);

            // Synchronize currentGrid with returned grid if provided
            if (data.grid) {
                currentGrid = {
                    rows: payload.rows,
                    cols: payload.cols,
                    grid: data.grid,
                    start: data.start,
                    goal: data.goal
                };
            }
            animateExploration(currentGrid, data.explored_order, data.path);
            addLog(`CPython: ${data.python_time_ms}ms | Cython: ${data.cython_time_ms}ms | Acceleration: ${data.speedup}x`, "perf");
            addLog(`Pathfinding path length: ${pathLen} cells. Nodes explored: ${visited}`, "ready");
        }

        if (termStatusMsg) {
            termStatusMsg.textContent = "STATUS: BENCHMARK OK";
            termStatusMsg.style.color = "var(--term-green)";
        }
    } catch (err) {
        console.error("Benchmark failed", err);
        addLog(`Benchmark failed: ${err.message}`, "warn");
        if (termStatusMsg) {
            termStatusMsg.textContent = "STATUS: ERROR";
            termStatusMsg.style.color = "var(--term-red)";
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = "1";
        }
    }
}

// Tab 2: Full Suite, Table & Charts
async function loadBenchmarkSuite() {
    addLog("Executing full multi-scale matrix suite across test permutations...", "sys");
    try {
        const res = await fetch("/api/suite");
        const suite = await res.json();
        suiteDataCache = suite;

        populateMatrixTable(suite);

        if (typeof Chart !== "undefined") {
            createTerminalChart("chart-nqueens", suite.nqueens, "N-Queens Solutions (ms)");
            createTerminalChart("chart-dijkstra", suite.dijkstra, "Dijkstra Latency (ms)");
            createTerminalChart("chart-astar", suite.astar, "A* Latency (ms)");
        } else {
            console.warn("Chart.js library not available; table populated successfully.");
        }

        addLog("Full matrix benchmark suite completed and charts synchronized.", "ready");
    } catch (err) {
        console.error("Failed to load suite", err);
        addLog(`ERR: Failed to load benchmark suite: ${err.message}`, "warn");
    }
}

function populateMatrixTable(suite) {
    const tbody = $("matrix-table-body");
    if (!tbody || !suite) return;
    tbody.innerHTML = "";

    const rows = [];
    (suite.nqueens || []).forEach(d => {
        rows.push({ algo: "N-Queens", scale: d.label, py: d.python, cy: d.cython, speedup: d.speedup });
    });
    (suite.dijkstra || []).forEach(d => {
        rows.push({ algo: "Dijkstra", scale: d.label, py: d.python, cy: d.cython, speedup: d.speedup });
    });
    (suite.astar || []).forEach(d => {
        rows.push({ algo: "A* Search", scale: d.label, py: d.python, cy: d.cython, speedup: d.speedup });
    });

    rows.forEach(r => {
        const delta = (r.cy - r.py).toFixed(2);
        const tr = document.createElement("tr");
        const bar = makeAsciiMeter(Math.min(r.speedup / 45.0, 1.0), 16);
        tr.innerHTML = `
            <td>${r.algo}</td>
            <td>${r.scale}</td>
            <td>${r.py.toFixed(2)}</td>
            <td>${r.cy.toFixed(2)}</td>
            <td>${delta}</td>
            <td class="term-accent">${r.speedup}x</td>
            <td><span class="ascii-bar">${bar}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function createTerminalChart(canvasId, dataset, title) {
    const el = $(canvasId);
    if (!el || typeof Chart === "undefined" || !dataset) return;
    const ctx = el.getContext("2d");
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    const labels = dataset.map(d => `${d.label} [${d.speedup}x]`);
    const pyTimes = dataset.map(d => d.python);
    const cyTimes = dataset.map(d => d.cython);

    const theme = document.documentElement.getAttribute("data-theme") || "cyber";
    let pyColor = "#00e5ff";
    let cyColor = "#00ff66";
    let pyBg = "rgba(0, 229, 255, 0.4)";
    let cyBg = "rgba(0, 255, 102, 0.5)";

    if (theme === "phosphor") {
        pyColor = "#33ff88";
        cyColor = "#00ff66";
        pyBg = "rgba(51, 255, 136, 0.3)";
        cyBg = "rgba(0, 255, 102, 0.6)";
    } else if (theme === "amber") {
        pyColor = "#ffc966";
        cyColor = "#ff9900";
        pyBg = "rgba(255, 201, 102, 0.3)";
        cyBg = "rgba(255, 153, 0, 0.6)";
    }

    charts[canvasId] = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "CPython (Pure)",
                    data: pyTimes,
                    backgroundColor: pyBg,
                    borderColor: pyColor,
                    borderWidth: 1,
                    borderRadius: 0
                },
                {
                    label: "Cython (Native -O3)",
                    data: cyTimes,
                    backgroundColor: cyBg,
                    borderColor: cyColor,
                    borderWidth: 1,
                    borderRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: "rgba(255, 255, 255, 0.05)" },
                    ticks: { color: "#64748b", font: { family: "JetBrains Mono", size: 10 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: "#94a3b8", font: { family: "JetBrains Mono", size: 10 } }
                }
            },
            plugins: {
                legend: {
                    labels: { color: "#cbd5e1", font: { family: "JetBrains Mono", size: 11 }, boxWidth: 12 }
                },
                tooltip: {
                    backgroundColor: "#0f172a",
                    titleColor: "#f8fafc",
                    bodyColor: "#cbd5e1",
                    borderColor: cyColor,
                    borderWidth: 1,
                    titleFont: { family: "JetBrains Mono" },
                    bodyFont: { family: "JetBrains Mono" }
                }
            }
        }
    });
}

function setupExportButtons() {
    const btnJson = $("btn-export-json");
    const btnCsv = $("btn-export-csv");
    if (btnJson) btnJson.addEventListener("click", () => exportJsonFile());
    if (btnCsv) btnCsv.addEventListener("click", () => exportCsvFile());
}

function exportJsonFile() {
    if (!suiteDataCache) {
        loadBenchmarkSuite().then(() => exportJsonFile());
        return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(suiteDataCache, null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `cython_cpython_benchmark_${Date.now()}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    addLog("Exported raw benchmark matrix to JSON file.", "sys");
}

function exportCsvFile() {
    if (!suiteDataCache) {
        loadBenchmarkSuite().then(() => exportCsvFile());
        return;
    }
    let csv = "algorithm,scale,cpython_ms,cython_ms,speedup\n";
    ["nqueens", "dijkstra", "astar"].forEach(algo => {
        (suiteDataCache[algo] || []).forEach(d => {
            csv += `${algo},${d.label},${d.python},${d.cython},${d.speedup}\n`;
        });
    });
    const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `cython_cpython_benchmark_${Date.now()}.csv`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    addLog("Exported benchmark matrix to CSV table.", "sys");
}

// Tab 3: Code Inspector
function switchCodeAlgo(algo) {
    document.querySelectorAll(".code-btn").forEach(btn => {
        if (btn.getAttribute("data-codealgo") === algo) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
    loadCode(algo);
}

function setupCodeInspector() {
    document.querySelectorAll(".code-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            switchCodeAlgo(btn.getAttribute("data-codealgo"));
        });
    });
    loadCode("nqueens");
}

async function loadCode(algo) {
    try {
        const res = await fetch(`/api/code/${algo}`);
        const data = await res.json();

        const pyEl = $("code-py");
        const cyEl = $("code-cy");

        if (pyEl) pyEl.innerHTML = formatCodeWithLineNumbers(data.python_code);
        if (cyEl) cyEl.innerHTML = formatCodeWithLineNumbers(data.cython_code);

        const highlightsEl = $("code-highlights");
        if (highlightsEl) {
            highlightsEl.innerHTML = "";
            (data.notes || []).forEach(note => {
                const li = document.createElement("li");
                li.textContent = note;
                highlightsEl.appendChild(li);
            });
        }

        addLog(`Vimdiff source buffer updated: ${algo.toUpperCase()}`, "sys");
    } catch (err) {
        console.error("Failed to load code", err);
        addLog(`ERR: Failed to load source diff: ${err.message}`, "warn");
    }
}

function formatCodeWithLineNumbers(code) {
    const lines = (code || "").split("\n");
    return lines.map((l, i) => {
        const num = String(i + 1).padStart(3, "0");
        return `<span style="color:var(--term-dim);user-select:none;">${num} | </span>${escapeHtml(l)}`;
    }).join("\n");
}
