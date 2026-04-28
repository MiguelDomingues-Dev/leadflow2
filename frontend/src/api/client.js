import axios from 'axios'
import toast from 'react-hot-toast'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4031/api'
const api = axios.create({ baseURL: BASE, timeout: 10000 })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('lf_token')
  if (token) cfg.headers.Authorization = 'Bearer ' + token
  return cfg
})

api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('lf_token'); localStorage.removeItem('lf_user')
    if (!window.location.pathname.includes('/login')) window.location.href = '/login'
    return Promise.reject(err)
  }
  const msg = err.response?.data?.error || 'Erro na requisicao'
  toast.error(msg)
  return Promise.reject(err)
})

export const login = d => api.post('/auth/login', d)
export const logout = () => api.post('/auth/logout')
export const getMe = () => api.get('/auth/me')
export const updateMyGoal = d => api.put('/users/me/goal', d)
export const setupAdmin = d => api.post('/auth/setup', d)
export const changePass = d => api.put('/auth/change-password', d)
export const getUsers = () => api.get('/users/')
export const createUser = d => api.post('/users/', d)
export const updateUser = (id, d) => api.put('/users/' + id, d)
export const deleteUser = id => api.delete('/users/' + id)
export const getLeads = p => api.get('/leads/', { params: p })
export const getLead = id => api.get('/leads/' + id)
export const createLead = d => api.post('/leads/', d)
export const updateLead = (id, d) => api.put('/leads/' + id, d)
export const deleteLead = id => api.delete('/leads/' + id)
export const addActivity = (id, d) => api.post('/leads/' + id + '/activity', d)
export const addAudioActivity = (id, fd) => api.post('/leads/' + id + '/activities/audio', fd)
export const getPlatforms = () => api.get('/platforms/')
export const getAuditLogs = () => api.get('/audit/')
export const getSettings = () => api.get('/settings/')
export const updateSettings = d => api.post('/settings/', d)
export const bulkActionLeads = d => api.post('/leads/bulk-action', d)
export const createPlatform = d => api.post('/platforms/', d)
export const updatePlatform = (id, d) => api.put('/platforms/' + id, d)
export const deletePlatform = id => api.delete('/platforms/' + id)
export const getVendors = () => api.get('/vendors/')
export const createVendor = d => api.post('/vendors/', d)
export const updateVendor = (id, d) => api.put('/vendors/' + id, d)
export const getStatuses = () => api.get('/statuses/')
export const createStatus = d => api.post('/statuses/', d)
export const updateStatus = (id, d) => api.put('/statuses/' + id, d)
export const deleteStatus = id => api.delete('/statuses/' + id)
export const getDashboard = () => api.get('/dashboard/')
export const getTopVideos = () => api.get('/dashboard/top-videos')
export const updateLeadStatus = (leadId, statusId) => api.put('/leads/' + leadId, { status_id: statusId })
export const generateTrackedLink = d => api.post('/links/generate', d)
export default api
export const qualifyLead = (id, d) => api.post('/leads/' + id + '/qualify', d)

export const getProducts = () => api.get('/products/')
export const createProduct = d => api.post('/products/', d)
export const updateProduct = (id, d) => api.put('/products/' + id, d)
export const deleteProduct = id => api.delete('/products/' + id)

export const createSale = d => api.post('/sales/', d)
export const getSales = p => api.get('/sales/', { params: p })
export const getSaleDetails = id => api.get('/sales/' + id)
export const updateSaleStatus = (id, status) => api.put('/sales/' + id + '/status', { status })

export const getPipelines = () => api.get('/pipelines/')
export const createPipeline = d => api.post('/pipelines/', d)
export const updatePipeline = (id, d) => api.put('/pipelines/' + id, d)
export const deletePipeline = id => api.delete('/pipelines/' + id)

export const getCustomFields = () => api.get('/custom-fields/')
export const createCustomField = d => api.post('/custom-fields/', d)
export const updateCustomField = (id, d) => api.put('/custom-fields/' + id, d)
export const deleteCustomField = id => api.delete('/custom-fields/' + id)

export const addLeadAttachment = (id, fd) => api.post('/leads/' + id + '/attachments', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
export const deleteLeadAttachment = (id, attId) => api.delete('/leads/' + id + '/attachments/' + attId)

export const addSaleAttachment = (id, fd) => api.post('/sales/' + id + '/attachments', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
export const deleteSaleAttachment = (id, attId) => api.delete('/sales/' + id + '/attachments/' + attId)

export const getReminders = p => api.get('/reminders/', { params: p })
export const updateReminderStatus = (id, status) => api.put('/reminders/' + id + '/status', { status })
export const deleteReminder = id => api.delete('/reminders/' + id)

export const getVendorHistory = id => api.get('/vendors/' + id + '/history')
