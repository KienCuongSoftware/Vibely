/** In-memory draft for Studio photo posts (Files cannot live in the router). */
let photoDraftFiles = []

export function setPhotoDraftFiles(files) {
  photoDraftFiles = Array.isArray(files) ? [...files] : []
}

export function getPhotoDraftFiles() {
  return photoDraftFiles
}

export function clearPhotoDraftFiles() {
  photoDraftFiles = []
}
