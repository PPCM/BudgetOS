import { useState, useRef, useEffect } from 'react'
import { Upload, X, User, Loader2 } from 'lucide-react'
import { uploadsApi } from '../lib/api'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// Modal spécial pour l'éditeur d'image (z-index élevé pour s'afficher au-dessus des autres modals)
function ImageEditModal({ children, onClose }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose()
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4"
    >
      {children}
    </div>
  )
}

export default function PayeeImageEditor({ 
  imageUrl, 
  payeeName, 
  onImageChange,
  size = 'lg' 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  }

  // Upload d'une image personnalisée
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validation
    if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
      setError('Format non supporté. Utilisez PNG, JPEG ou GIF.')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('Fichier trop volumineux. Maximum 5 Mo.')
      return
    }

    setIsUploading(true)
    setError('')

    try {
      const response = await uploadsApi.uploadPayeeImage(file)
      onImageChange(response.data.data.imageUrl)
      setIsOpen(false)
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Erreur lors du téléchargement')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Supprimer l'image
  const removeImage = () => {
    onImageChange(null)
    setIsOpen(false)
  }

  return (
    <div className="relative inline-block">
      {/* Image actuelle */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative group cursor-pointer"
      >
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden border-2 border-gray-200 hover:border-primary-400 transition-colors`}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={payeeName || 'Image'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
              <User className="w-1/2 h-1/2" />
            </div>
          )}
        </div>
        <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Upload className="w-1/3 h-1/3 text-white" />
        </div>
      </button>

      {/* Modal d'édition */}
      {isOpen && (
        <ImageEditModal onClose={() => setIsOpen(false)}>
          <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Image du tiers</h3>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              {/* Image actuelle */}
              {imageUrl && (
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <img
                    src={imageUrl}
                    alt="Actuelle"
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Image actuelle</p>
                  </div>
                  <button
                    onClick={removeImage}
                    className="btn btn-secondary text-sm px-3 py-1"
                  >
                    Supprimer
                  </button>
                </div>
              )}

              {/* Upload personnalisé */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Upload className="w-4 h-4 inline mr-1" />
                  Télécharger une image
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="payee-image-upload"
                  />
                  <label
                    htmlFor="payee-image-upload"
                    className="cursor-pointer"
                  >
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 mx-auto text-primary-500 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">
                          Cliquez ou glissez une image
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          PNG, JPEG ou GIF • Max 5 Mo • Redimensionnée à 256×256
                        </p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Erreur */}
              {error && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {error}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t">
              <button
                onClick={() => setIsOpen(false)}
                className="btn btn-secondary w-full"
              >
                Fermer
              </button>
            </div>
          </div>
        </ImageEditModal>
      )}
    </div>
  )
}
