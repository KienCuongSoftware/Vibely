/**
 * Hand-off of the host's mic/camera choices from the Go LIVE preview to the studio of the
 * LIVE it just created. Memory only (device ids are never persisted) and a single slot:
 * it only ever applies to the most recently created LIVE.
 *
 * @typedef {Object} HostMediaPreferences
 * @property {boolean} micEnabled
 * @property {boolean} cameraEnabled
 * @property {{ audioinput: string|null, videoinput: string|null }} selectedDeviceIds
 */

let slot = null

/** @param {string} liveId @param {Partial<HostMediaPreferences>} state */
export function rememberHostMediaPreferences(liveId, state) {
  if (!liveId || !state) return
  slot = {
    liveId,
    preferences: {
      micEnabled: state.micEnabled !== false,
      cameraEnabled: state.cameraEnabled !== false,
      selectedDeviceIds: {
        audioinput: state.selectedDeviceIds?.audioinput ?? null,
        videoinput: state.selectedDeviceIds?.videoinput ?? null,
      },
    },
  }
}

/**
 * Not consumed on read: StrictMode (and a controller re-created for the same LIVE) must see
 * the same choices.
 * @returns {HostMediaPreferences|null}
 */
export function hostMediaPreferencesFor(liveId) {
  return slot && slot.liveId === liveId ? slot.preferences : null
}
