import { defineStore } from 'pinia'
import { ref } from 'vue'

import type { Polygon, Polyline, Waypoint } from '@/types/components/map'
import { addOrUpdate, remove } from '@/utils/utils'

export const useMapStore = defineStore('map', () => {
  const waypoints = ref<Waypoint[]>([])
  const polylines = ref<Polyline[]>([])
  const contextWaypoints = ref<Waypoint[]>([])
  const polygons = ref<Polygon[]>([])
  // Id of the context waypoint (e.g. an ATM aircraft) currently selected via a
  // map click
  const selectedWaypointId = ref<string>()
  // Pan and zoom of the map, saved when the map is left (e.g. for another tab) so that it reopens on the same view.
  // Cleared with resetView() when the CAB is entered.
  const view = ref<{ entity: string; center: [number, number]; zoom: number }>()

  function reset() {
    resetWaypoints()
    resetPolylines()
    resetContextWaypoints()
    resetPolygons()
    selectedWaypointId.value = undefined
  }

  function resetView() {
    view.value = undefined
  }

  // Clicking the already-selected waypoint deselects it.
  function selectWaypoint(id: string) {
    selectedWaypointId.value = selectedWaypointId.value === id ? undefined : id
  }

  function addWaypoint(waypoint: Waypoint) {
    addOrUpdate(waypoints.value, waypoint, (el) => el.id === waypoint.id)
  }

  function removeWaypoint(waypoint: Waypoint) {
    remove(waypoints.value, (el) => el.id === waypoint.id)
  }

  function removeCategoryWaypoint(category: string) {
    for (const waypoint of waypoints.value.filter((w) => w.category === category))
      remove(waypoints.value, (el) => el.id === waypoint.id)
  }

  function resetWaypoints() {
    waypoints.value.splice(0, waypoints.value.length)
  }
  function addPolyline(polyline: Polyline) {
    addOrUpdate(polylines.value, polyline, (el) => el.id === polyline.id)
  }

  function removePolyline(polyline: Polyline) {
    remove(polylines.value, (el) => el.id === polyline.id)
  }

  function resetPolylines() {
    polylines.value.splice(0, polylines.value.length)
  }
  function addContextWaypoint(waypoint: Waypoint) {
    addOrUpdate(contextWaypoints.value, waypoint, (el) => el.id === waypoint.id)
  }

  function removeContextWaypoint(waypoint: Waypoint) {
    remove(contextWaypoints.value, (el) => el.id === waypoint.id)
  }

  function resetContextWaypoints() {
    contextWaypoints.value.splice(0, contextWaypoints.value.length)
  }

  function addPolygon(polygon: Polygon) {
    addOrUpdate(polygons.value, polygon, (el) => el.id === polygon.id)
  }

  function removePolygon(polygon: Polygon) {
    remove(polygons.value, (el) => el.id === polygon.id)
  }

  function removeCategoryPolygon(category: string) {
    for (const polygon of polygons.value.filter((p) => p.category === category))
      remove(polygons.value, (el) => el.id === polygon.id)
  }

  function resetPolygons() {
    polygons.value.splice(0, polygons.value.length)
  }

  return {
    waypoints,
    polylines,
    contextWaypoints,
    polygons,
    selectedWaypointId,
    view,
    reset,
    resetView,
    selectWaypoint,
    addWaypoint,
    removeWaypoint,
    removeCategoryWaypoint,
    resetWaypoints,
    addPolyline,
    removePolyline,
    resetPolylines,
    addContextWaypoint,
    removeContextWaypoint,
    resetContextWaypoints,
    addPolygon,
    removePolygon,
    removeCategoryPolygon,
    resetPolygons
  }
})
