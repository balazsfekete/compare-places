import maplibregl from 'maplibre-gl'
import './style/global.css'

const getZoomAdjustment = (oldLat, newLat) => Math.log2(Math.cos((newLat / 180) * Math.PI) / Math.cos((oldLat / 180) * Math.PI))
const wrapAngle = (angle) => ((((angle + 180) % 360) + 360) % 360) - 180

let updatingCameras = false
let silentHashUpdate = false

let zoom = 2

const createMap = (container, attribution) => {
  const map = new maplibregl.Map({
    container: container,
    style: 'https://tiles.openfreemap.org/styles/bright',
    center: [0, 0],
    zoom,
    canvasContextAttributes: { antialias: true },
    attributionControl: attribution,
  })

  map.on('style.load', () => map.setProjection({ type: 'globe' })) // Set projection to globes
  map.dragRotate.disable() // Disable map rotation using right click + drag
  map.keyboard.disable() // Disable map rotation using keyboard
  map.touchZoomRotate.disableRotation() // Disable map rotation using touch rotation gesture

  map.scrollZoom.setWheelZoomRate(1 / 200)
  map.scrollZoom.setZoomRate(1 / 25)

  return map
}

const mapA = createMap('mapA', false)
const mapB = createMap('mapB', true)

updateFromHash()

mapA.on('move', () => {
  if (updatingCameras) return
  updatingCameras = true
  zoom = mapA.getZoom() + getZoomAdjustment(mapA.getCenter().lat, 0)
  mapB.setZoom(zoom + getZoomAdjustment(0, mapB.getCenter().lat))
  updatingCameras = false
})

mapB.on('move', () => {
  if (updatingCameras) return
  updatingCameras = true
  zoom = mapB.getZoom() + getZoomAdjustment(mapB.getCenter().lat, 0)
  mapA.setZoom(zoom + getZoomAdjustment(0, mapA.getCenter().lat))
  updatingCameras = false
})

mapA.on('moveend', () => {
  if (updatingCameras) return
  silentHashUpdate = true
  updateHash()
})
mapB.on('moveend', () => {
  if (updatingCameras) return
  silentHashUpdate = true
  updateHash()
})

// Scale bar

let unit = localStorage.getItem('unit') || preferredUnit()

const scale = new maplibregl.ScaleControl({ maxWidth: 100, unit })
mapA.addControl(scale)

scale._container.title = `Switch to ${unit === 'metric' ? 'imperial' : 'metric'}`

scale._container.onclick = () => {
  scale._container.title = `Switch to ${unit}`
  unit = unit === 'metric' ? 'imperial' : 'metric'
  localStorage.setItem('unit', unit)
  scale.setUnit(unit)
}

function preferredUnit() {
  const imperialLocales = ['en-us', 'lr', 'mm']
  const userLocale = navigator.language.toLowerCase()
  const prefersImperial = imperialLocales.some((loc) => userLocale.startsWith(loc))
  return prefersImperial ? 'imperial' : 'metric'
}

// URL hash

window.onhashchange = () => {
  if (silentHashUpdate) {
    silentHashUpdate = false
    return
  }
  updateFromHash()
}

function updateHash() {
  updatingCameras = true
  const hashArray = [zoom.toFixed(2), mapA.getCenter().lat.toFixed(5), mapA.getCenter().lng.toFixed(5), mapB.getCenter().lat.toFixed(5), mapB.getCenter().lng.toFixed(5)]
  location.hash = hashArray.join('/')
  updatingCameras = false
}

function updateFromHash() {
  let [newZoom, newLatA, newLngA, newLatB, newLngB] = location.hash.substring(1).split('/')

  zoom = Math.min(Math.max(parseFloat(newZoom), -2), 22) || zoom

  const latA = wrapAngle(parseFloat(newLatA)) || mapA.getCenter().lat
  const lngA = wrapAngle(parseFloat(newLngA)) || mapA.getCenter().lng
  const latB = wrapAngle(parseFloat(newLatB)) || mapB.getCenter().lat
  const lngB = wrapAngle(parseFloat(newLngB)) || mapB.getCenter().lng

  updatingCameras = true
  mapA.setCenter([lngA, latA])
  mapB.setCenter([lngB, latB])
  mapA.setZoom(zoom + getZoomAdjustment(0, mapA.getCenter().lat))
  mapB.setZoom(zoom + getZoomAdjustment(0, mapB.getCenter().lat))
  updatingCameras = false

  updateHash()
}

document.getElementById('mapStyleButton').onclick = () => {
  mapA.setStyle('https://tiles.openfreemap.org/styles/bright')
  mapB.setStyle('https://tiles.openfreemap.org/styles/bright')
}

document.getElementById('satelliteStyleButton').onclick = () => {
  mapA.setStyle('/satellite.json')
  mapB.setStyle('/satellite.json')
}
