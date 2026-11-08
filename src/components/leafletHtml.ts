/**
 * Página HTML carregada dentro da WebView: o mesmo mapa do site
 * (public/assets/js/map.js): Leaflet 1.9.4 + mosaicos do OpenStreetMap,
 * com as mesmas cores, camadas e popups.
 */
export const leafletHtml = `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="anonymous">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin="anonymous"></script>
<style>
  html, body, #map { margin: 0; height: 100%; width: 100%; background: #cfe0f7; }
  body { font-family: -apple-system, Roboto, "Segoe UI", sans-serif; }
  .leaflet-popup-content { margin: 12px 14px; font-size: 13px; line-height: 1.45; color: #0b1a3a; }
  .leaflet-popup-content strong { display: block; font-size: 14px; margin-bottom: 4px; }
  .leaflet-popup-content p { margin: 2px 0; }
  .leaflet-popup-content a { color: #1447d4; font-weight: 700; }
  .leaflet-control-attribution { font-size: 10px; }
  body.dark, body.dark #map { background: #071230; }
  body.dark .leaflet-tile-pane { filter: invert(1) hue-rotate(180deg) brightness(.85) contrast(.92); }
  body.dark .leaflet-popup-content-wrapper, body.dark .leaflet-popup-tip { background: #0a1734; }
  body.dark .leaflet-popup-content { color: #e9efff; }
  body.dark .leaflet-popup-content a { color: #7ea5ff; }
  body.dark .leaflet-bar a { background: #0a1734; border-color: #1b3163; color: #e9efff; }
  body.dark .leaflet-control-attribution { background: rgba(10, 23, 52, .8); color: #93a6d1; }
</style>
</head><body><div id="map"></div>
<script>
(function () {
  function send(message) { try { window.ReactNativeWebView.postMessage(JSON.stringify(message)); } catch (e) {} }
  if (!window.L) { send({ type: "error", message: "O mapa visual não carregou. Verifique a conexão com a internet." }); return; }

  // Cores da central meteorológica (site.tpl.html).
  var inmetColors = { LOW: "#FFFE00", MODERATE: "#FFFE00", HIGH: "#F96602", CRITICAL: "#e3001b" };
  var teamAlerts = {
    TORNADO: { fill: "#d21428", opacity: .72, line: "#ff4257" },
    SEVERE_STORM: { fill: "#f0c800", opacity: .7, line: "#ffe100" }
  };
  var levels = {
    T: { name: "Tempestades não severas", color: "#39ff14", line: "#39ff14", opacity: .3 },
    1: { name: "Nível 1", color: "#ffe100", line: "#ffe100", opacity: .33 },
    2: { name: "Nível 2", color: "#ff7a00", line: "#ff7a00", opacity: .38 },
    3: { name: "Nível 3", color: "#ff1a1a", line: "#ff2a2a", opacity: .42 },
    4: { name: "Nível 4", color: "#9d1cff", line: "#a63bff", opacity: .45 }
  };
  var severityNames = { LOW: "Baixo", MODERATE: "Moderado", HIGH: "Alto", CRITICAL: "Crítico" };
  var map = L.map("map", { zoomControl: false, attributionControl: true }).setView([-15.7, -51.5], 4);
  // Plano próprio: os alertas ficam acima de previsões e INMET mesmo ao alternar as camadas.
  map.createPane("severeAlerts").style.zIndex = 450;
  L.control.zoom({ position: "bottomright" }).addTo(map);
  var tileFailed = false;
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).on("tileerror", function () { if (!tileFailed) { tileFailed = true; send({ type: "tileerror" }); } }).addTo(map);
  var pointLayer = L.layerGroup().addTo(map);
  var groups = {
    inmFut: L.layerGroup().addTo(map), inmHoje: L.layerGroup().addTo(map),
    prev: L.layerGroup().addTo(map), alerta: L.layerGroup().addTo(map)
  };
  var shapes = {};

  function el(tag, text) { var n = document.createElement(tag); n.textContent = text; return n; }
  function trusted(url) {
    try {
      var u = new URL(url);
      var ok = ["inmet.gov.br", "open-meteo.com"].some(function (h) { return u.hostname === h || u.hostname.endsWith("." + h); });
      return ok && u.protocol === "https:" && !u.username && !u.password ? u.href : null;
    } catch (e) { return null; }
  }
  function date(value) {
    var d = new Date(value); function p(n) { return String(n).padStart(2, "0"); }
    return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear() + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  function popup(title, detail, source, url, until, description) {
    var node = document.createElement("div");
    node.append(el("strong", title));
    if (description) node.append(el("p", description));
    node.append(el("p", detail), el("p", "Fonte: " + source));
    if (until) node.append(el("p", "Válido até " + date(until)));
    var link = url && trusted(url);
    if (link) {
      var a = el("a", "Consultar fonte ↗"); a.href = "#";
      a.addEventListener("click", function (e) { e.preventDefault(); send({ type: "open", url: link }); });
      node.append(a);
    }
    return node;
  }
  function rank(area) { var n = area.properties && area.properties.nivel; return n === "T" ? 0 : Number(n) || 0; }

  function warningShape(alert, style, pane) {
    return alert.polygon ? L.geoJSON(alert.polygon, { pane: pane, style: style }) :
      (alert.latitude != null && alert.longitude != null && Number(alert.radius_km) > 0) ?
        L.circle([Number(alert.latitude), Number(alert.longitude)], Object.assign({}, style, { pane: pane, radius: Number(alert.radius_km) * 1000 })) : null;
  }
  function addWarning(alert, style, group) {
    try {
      var shape = warningShape(alert, style, group === "alerta" ? "severeAlerts" : "overlayPane");
      if (!shape) return;
      shape.bindPopup(popup(alert.title, (severityNames[alert.severity] || alert.severity) + " · " + alert.area_name, alert.source_name, alert.source_url, alert.valid_until, alert.message), { maxHeight: 240 }).addTo(groups[group]);
      shape.pcGroup = group;
      shapes[alert.id] = shape;
    } catch (e) {}
  }
  var visible = { prev: true, alerta: true, inmHoje: true, inmFut: true };

  function draw(state) {
    var data = state.data || {};
    pointLayer.clearLayers(); shapes = {};
    Object.keys(groups).forEach(function (key) { groups[key].clearLayers(); });
    (data.forecast_points || []).forEach(function (p) {
      L.circleMarker([Number(p.latitude), Number(p.longitude)], { pane: "markerPane", radius: 10, color: "#fff", fillColor: "#3a74ff", fillOpacity: 1, weight: 3 })
        .bindPopup(popup(p.city + ", " + p.state, p.condition + " · " + Math.round(Number(p.temperature_c)) + " °C" + (p.is_stale ? " · Último dado salvo" : ""), p.source_name, p.source_url, null))
        .addTo(pointLayer);
    });
    var published = state.publishedText || "";
    (data.published_areas || []).slice().sort(function (a, b) { return rank(a) - rank(b); }).forEach(function (area) {
      try {
        var info = area.properties || {};
        var level = levels[info.nivel] || levels[1];
        L.geoJSON(area.geometry, { style: { color: level.line, fillColor: level.color, fillOpacity: level.opacity, weight: 2.2 } })
          .bindPopup(popup(info.nome || "Previsão de tempo severo", (info.descricao ? info.descricao + " · " : "") + level.name + published, "Meteorologistas PrevClima", null, info.validade || null)).addTo(groups.prev);
      } catch (e) {}
    });
    (data.upcoming_alerts || []).forEach(function (alert) {
      var color = inmetColors[alert.severity] || inmetColors.MODERATE;
      addWarning(alert, { color: color, fillColor: color, fillOpacity: .13, weight: 1.6, dashArray: "6 4" }, "inmFut");
    });
    (data.alerts || []).forEach(function (alert) {
      if (alert.origin === "MANUAL") {
        var team = teamAlerts[alert.event_type] || teamAlerts.SEVERE_STORM;
        addWarning(alert, { color: team.line, fillColor: team.fill, fillOpacity: team.opacity, weight: 2.2 }, "alerta");
      } else {
        var color = inmetColors[alert.severity] || inmetColors.MODERATE;
        addWarning(alert, { color: color, fillColor: color, fillOpacity: .32, weight: 1.6 }, "inmHoje");
      }
    });
    if (state.layers) layers(state.layers);
  }
  function layers(value) {
    visible = value;
    Object.keys(groups).forEach(function (key) {
      if (value[key] === false) groups[key].removeFrom(map); else groups[key].addTo(map);
    });
  }
  function fitAll() {
    var all = pointLayer.getLayers();
    Object.keys(groups).forEach(function (key) { if (visible[key] !== false) all = all.concat(groups[key].getLayers()); });
    if (!all.length) { map.setView([-15.7, -51.5], 4); return; }
    var bounds = L.featureGroup(all).getBounds();
    if (bounds.isValid()) map.fitBounds(bounds.pad(.15), { maxZoom: 10 });
  }

  window.prevclima = {
    render: function (state) {
      draw(state);
      if (state.recenter) {
        var p = (state.data && state.data.forecast_points || [])[0];
        if (p) map.setView([Number(p.latitude), Number(p.longitude)], 8); else fitAll();
      }
      map.invalidateSize();
    },
    layers: layers,
    theme: function (dark) { document.body.classList.toggle("dark", !!dark); },
    fitAll: fitAll,
    focus: function (id) {
      var shape = shapes[id]; if (!shape) return;
      groups[shape.pcGroup].addTo(map);
      map.fitBounds(shape.getBounds().pad(.2), { maxZoom: 10 });
      shape.openPopup();
    }
  };
  window.addEventListener("resize", function () { map.invalidateSize(); });
  send({ type: "ready" });
})();
</script></body></html>`;
