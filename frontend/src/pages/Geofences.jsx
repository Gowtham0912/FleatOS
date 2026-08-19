import React, { useState, useEffect } from 'react'
import { Polygon, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import L from 'leaflet'
import '@geoman-io/leaflet-geoman-free'
import { Truck, Plus, Trash2, Link as LinkIcon, Save, Navigation, MoreVertical } from 'lucide-react'
import { fetchGeofences, createGeofence, deleteGeofence, assignVehicleToGeofence } from '../api/fleetApi'
import FleetMap from '../components/FleetMap'
import { motion } from 'framer-motion'
import { FenceIcon } from '../components/icons/FenceIcon'

// Create a custom hook/component to add Geoman controls
function GeomanSetup({ onCreate, onEdit, onDelete, onMapClick }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    
    map.pm.addControls({
      position: 'topleft',
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: false,
      drawPolygon: true,
      drawCircle: false,
      drawText: false,
      editMode: false,
      dragMode: false,
      cutPolygon: false,
      removalMode: false,
      rotateMode: false,
    });

    map.on('pm:create', (e) => {
      onCreate(e.layer);
      // Remove it from map, we will render it via React state
      map.removeLayer(e.layer);
    });
    
    const clickHandler = (e) => {
        onMapClick(e);
    }
    
    map.on('click', clickHandler);

    return () => {
      map.pm.removeControls();
      map.off('pm:create');
      map.off('click', clickHandler);
    };
  }, [map, onCreate, onEdit, onDelete]);

  return null;
}

export default function Geofences({ vehicles, locations, isConnected, lastMessage, onRefresh }) {
  const [geofences, setGeofences] = useState([])
  const [selectedGeofence, setSelectedGeofence] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newZoneName, setNewZoneName] = useState('')
  const [newZoneCoords, setNewZoneCoords] = useState([])
  const [assignModalGeofenceId, setAssignModalGeofenceId] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type })
    setTimeout(() => setToastMessage(null), 3000)
  }
  
  const [assigningVehicleIds, setAssigningVehicleIds] = useState([])
  const [activeTab, setActiveTab] = useState('map') // For mobile layout

  // Sync assigned vehicles when assignment modal opens
  useEffect(() => {
    if (assignModalGeofenceId) {
      setAssigningVehicleIds(vehicles.filter(v => v.geofence_id === assignModalGeofenceId).map(v => v.id))
    } else {
      setAssigningVehicleIds([])
    }
  }, [assignModalGeofenceId, vehicles])

  // Load geofences
  useEffect(() => {
    loadGeofences()
  }, [])

  const loadGeofences = async () => {
    try {
      const data = await fetchGeofences()
      setGeofences(data)
    } catch (err) {
      console.error('Failed to load geofences:', err)
    }
  }

  const handleCreateShape = (layer) => {
    if (layer instanceof L.Polygon) {
      const latlngs = layer.getLatLngs()[0];
      const coords = latlngs.map(ll => ({ lat: ll.lat, lng: ll.lng }));
      setNewZoneCoords(coords);
      setIsCreating(true);
      setActiveTab('list'); // Switch to sidebar to save
    }
  }

  const saveNewGeofence = async () => {
    if (!newZoneName.trim() || newZoneCoords.length < 3) return;
    try {
      const createdGeofence = await createGeofence({ name: newZoneName, coordinates: newZoneCoords });
      setIsCreating(false);
      setNewZoneName('');
      setNewZoneCoords([]);
      await loadGeofences();
      setAssignModalGeofenceId(createdGeofence.id);
    } catch (err) {
      console.error('Failed to create geofence:', err)
      showToast("Error creating geofence", "error");
    }
  }

  const handleDelete = (id) => {
    setDeleteConfirmId(id);
  }

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteGeofence(deleteConfirmId);
      if (selectedGeofence?.id === deleteConfirmId) {
        setSelectedGeofence(null);
      }
      loadGeofences();
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Failed to delete geofence:', err)
    }
  }

  const handleAssignVehicle = async (geofenceId) => {
    try {
      const originallyAssigned = vehicles.filter(v => v.geofence_id === geofenceId).map(v => v.id);
      const toAssign = assigningVehicleIds.filter(id => !originallyAssigned.includes(id));
      const toUnassign = originallyAssigned.filter(id => !assigningVehicleIds.includes(id));
      
      if (toAssign.length === 0 && toUnassign.length === 0) return;

      const promises = [];
      toAssign.forEach(id => promises.push(assignVehicleToGeofence(id, geofenceId)));
      toUnassign.forEach(id => promises.push(assignVehicleToGeofence(id, null)));
      
      await Promise.all(promises);
      
      showToast('Vehicles updated successfully!');
      setAssignModalGeofenceId(null);
      
      if (onRefresh) {
        onRefresh();
      }
    } catch(err) {
      console.error(err);
      showToast('Error assigning vehicle', 'error');
    }
  }
  
  const onMapClick = (e) => {
      setSelectedGeofence(null);
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col flex-1 min-h-0 bg-white dark:bg-slate-950 transition-colors"
    >
      
      {/* ── Mobile View Toggle Pill ────────────── */}
      <div className="md:hidden flex items-center justify-center p-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 transition-colors">
        <div className="flex items-center bg-white dark:bg-slate-950 p-1 rounded border border-slate-200 dark:border-slate-800 w-full max-w-xs shadow-sm transition-colors">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer ${activeTab === 'map'
                ? 'bg-brand-primary dark:bg-[#17b385] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
          >
            <span>Map View</span>
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer ${activeTab === 'list'
                ? 'bg-brand-primary dark:bg-[#17b385] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
          >
            <span>Zones</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 relative overflow-hidden">
        
        {/* Map */}
        <div className={`flex-1 relative ${activeTab === 'map' ? 'block' : 'hidden md:block'}`}>
          <FleetMap
            vehicles={vehicles}
            locations={locations}
            selectedVehicle={null}
            lastWsMessage={lastMessage}
          >
            <GeomanSetup 
              onCreate={handleCreateShape} 
              onMapClick={onMapClick}
            />

            {/* Render existing geofences */}
            {geofences.map(gf => {
               const positions = gf.coordinates.map(c => [c.lat, c.lng]);
               const isSelected = selectedGeofence?.id === gf.id;
               return (
                 <Polygon 
                   key={gf.id} 
                   positions={positions}
                   pathOptions={{ 
                     color: isSelected ? '#17b385' : '#3b82f6', 
                     fillColor: isSelected ? '#17b385' : '#3b82f6', 
                     fillOpacity: 0.2,
                     weight: isSelected ? 3 : 2
                   }}
                   eventHandlers={{
                     click: (e) => {
                       L.DomEvent.stopPropagation(e);
                       setSelectedGeofence(gf);
                       setActiveTab('list'); // Switch to sidebar on mobile
                     }
                   }}
                 />
               )
            })}

            {/* Render new geofence being drawn */}
            {isCreating && newZoneCoords.length > 0 && (
              <Polygon 
                positions={newZoneCoords.map(c => [c.lat, c.lng])}
                pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.3 }}
              />
            )}
          </FleetMap>
        </div>

        {/* Sidebar for actions */}
        <div className={`w-full md:w-56 shrink-0 bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 flex flex-col z-10 overflow-y-auto ${activeTab === 'list' ? 'block' : 'hidden md:flex'}`}>
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FenceIcon className="text-brand-primary dark:text-[#17b385]" size={20} />
              Geofences
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Draw polygons on the map to create zones, then assign vehicles.
            </p>
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            {isCreating ? (
              <div className="animate-fade-in flex flex-col h-full">
                <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Plus size={18} className="text-brand-primary dark:text-[#17b385]" /> New Zone
                </h3>
                <div className="space-y-4 flex-1">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Zone Name</label>
                    <input 
                      type="text" 
                      value={newZoneName}
                      onChange={(e) => setNewZoneName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      placeholder="e.g. Warehouse A"
                    />
                  </div>
                  <p className="text-xs text-slate-500">{newZoneCoords.length} points selected.</p>
                  
                  <div className="flex gap-2 pt-4">
                    <button 
                      onClick={saveNewGeofence}
                      disabled={!newZoneName.trim()}
                      className="flex-1 bg-brand-primary dark:bg-[#17b385] text-white py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <Save size={16} className="shrink-0" /> <span className="whitespace-nowrap">Save</span>
                    </button>
                    <button 
                      onClick={() => { setIsCreating(false); setNewZoneCoords([]); }}
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full animate-fade-in">
                {geofences.length === 0 ? (
                  <div className="text-center py-8 opacity-60">
                    <FenceIcon className="mx-auto mb-3" size={32} />
                    <p className="text-sm font-medium">No zones yet.</p>
                    <p className="text-xs mt-2">Use the polygon tool on the map to draw a new zone.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {geofences.map(gf => {
                      const isSelected = selectedGeofence?.id === gf.id;
                      return (
                      <div key={gf.id} className={`flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg transition-colors cursor-pointer border ${isSelected ? 'border-brand-primary dark:border-[#17b385] shadow-sm' : 'border-slate-200 dark:border-slate-800 hover:border-brand-primary/50'}`} onClick={() => {
                        setSelectedGeofence(gf);
                      }}>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">{gf.name}</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">{vehicles.filter(v => v.geofence_id === gf.id).length} vehicles assigned</p>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssignModalGeofenceId(gf.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    )})}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
      
      {/* Assign Vehicles Modal */}
      {assignModalGeofenceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-sm w-full p-6 animate-fade-in border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Assign Vehicles</h3>
              <button 
                onClick={() => { 
                  const id = assignModalGeofenceId;
                  setAssignModalGeofenceId(null); 
                  handleDelete(id); 
                }} 
                className="text-rose-500 hover:text-rose-600 p-1.5 bg-rose-50 dark:bg-rose-900/20 rounded-md border border-rose-100 dark:border-rose-900/30 transition-colors" 
                title="Delete Zone"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
              Select vehicles to assign to <strong className="text-slate-900 dark:text-white">{geofences.find(g => g.id === assignModalGeofenceId)?.name}</strong>.
            </p>
            
            <div className="space-y-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 mb-6 flex-1 min-h-[150px]">
              {vehicles.length === 0 && <p className="text-xs text-slate-500 italic p-2 text-center">No vehicles available</p>}
              {vehicles.map(v => (
                <label key={v.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-md transition-colors">
                  <input 
                    type="checkbox" 
                    checked={assigningVehicleIds.includes(v.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAssigningVehicleIds([...assigningVehicleIds, v.id])
                      } else {
                        setAssigningVehicleIds(assigningVehicleIds.filter(id => id !== v.id))
                      }
                    }}
                    className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary bg-white dark:bg-slate-950 dark:border-slate-700 w-4 h-4 cursor-pointer"
                  />
                  {v.name}
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-auto">
              <button 
                onClick={() => setAssignModalGeofenceId(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleAssignVehicle(assignModalGeofenceId)}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-primary dark:bg-[#17b385] hover:opacity-90 rounded-lg transition-colors shadow-sm"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-sm w-full p-6 animate-fade-in border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete Geofence</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
              Are you sure you want to delete the geofence <strong className="text-slate-900 dark:text-white">{geofences.find(g => g.id === deleteConfirmId)?.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
          <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium text-white ${toastMessage.type === 'error' ? 'bg-rose-500' : 'bg-[#17b385]'}`}>
            {toastMessage.message}
          </div>
        </div>
      )}
    </motion.div>
  )
}
