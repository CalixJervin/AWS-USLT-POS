import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react"
import bcrypt from "bcryptjs"
import { supabase } from "@/lib/supabase"
import { storage } from "@/lib/storage"

export type Role = "cashier" | "admin"

export interface Staff {
  id: string
  name: string
  role: Role
  avatarColor: string
  avatarInitials: string
  shiftStart?: string
  canManageMenu?: boolean
  canManageInventory?: boolean
}

interface AuthContextType {
  user: Staff | null
  staffList: Staff[]
  isLocked: boolean
  isInitialSetup: boolean
  isLoading: boolean
  login: (staffId: string, pin: string) => Promise<{ success: boolean; message: string }>
  logout: () => void
  lock: () => void
  unlock: (pin: string) => Promise<{ success: boolean; message: string }>
  addStaff: (staff: Omit<Staff, "id" | "avatarInitials">, pin: string) => Promise<{ success: boolean; message: string }>
  updateStaff: (staffId: string, data: Partial<Staff>, pin?: string) => Promise<{ success: boolean; message: string }>
  deleteStaff: (staffId: string) => Promise<void>
  switchUser: () => void;
  verifyMasterPIN: (pin: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const MASTER_RECOVERY_PIN = "9999" // Hardcoded master recovery PIN
const SHIFT_DURATION_MS = 8 * 60 * 60 * 1000
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 30 * 1000

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Staff | null>(null)
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [isLocked, setIsLocked] = useState(false)
  const [isInitialSetup, setIsInitialSetup] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchStaff = useCallback(async () => {
    try {
      const staff = await storage.getStaff()
      setStaffList(staff)
      setIsInitialSetup(staff.length === 0)
      return staff
    } catch (error) {
      console.error("Error fetching staff:", error)
      return []
    }
  }, [])

  // Load staff and session on mount
  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      const staff = await fetchStaff()
      
      const currentUserId = storage.getItem("timpla_current_user_id", null)
      const sessionExpiry = storage.getItem("timpla_session_expiry", null)

      if (currentUserId && sessionExpiry && parseInt(sessionExpiry) > Date.now()) {
        const currentUser = staff.find((s: Staff) => s.id === currentUserId)
        if (currentUser) {
          setUser(currentUser)
          setIsLocked(storage.getItem<string>("timpla_is_locked", "false") === "true")
        }
      }
      setIsLoading(false)
    }
    init()
  }, [fetchStaff])

  const lock = useCallback(() => {
    setIsLocked(true)
    storage.setItem("timpla_is_locked", "true")
  }, [])

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
    if (user && !isLocked) {
      inactivityTimerRef.current = setTimeout(() => {
        lock()
      }, INACTIVITY_TIMEOUT_MS)
    }
  }, [user, isLocked, lock])

  useEffect(() => {
    const events = ["mousedown", "keydown", "touchstart", "mousemove"]
    const handleActivity = () => resetInactivityTimer()

    events.forEach(event => window.addEventListener(event, handleActivity))
    resetInactivityTimer()

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity))
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
    }
  }, [resetInactivityTimer])

  const login = useCallback(async (staffId: string, pin: string): Promise<{ success: boolean; message: string }> => {
    const lockoutKey = `lockout_${staffId}`
    const attemptsKey = `attempts_${staffId}`

    const lockoutUntil = storage.getItem(lockoutKey, null)
    if (lockoutUntil && parseInt(lockoutUntil) > Date.now()) {
      return { success: false, message: "Account locked. Try again later." }
    }

    const { data: staffData, error } = await supabase
      .from('staff')
      .select('pin_hash')
      .eq('id', staffId)
      .single()

    if (error || !staffData) {
      return { success: false, message: "Staff member not found." }
    }

    const isMaster = pin === MASTER_RECOVERY_PIN
    const isPinValid = isMaster || await bcrypt.compare(pin, staffData.pin_hash)

    if (isPinValid) {
      const staffMember = staffList.find(s => s.id === staffId)
      if (staffMember) {
        setUser(staffMember)
        setIsLocked(false)
        storage.setItem("timpla_current_user_id", staffId)
        storage.setItem("timpla_session_expiry", (Date.now() + SHIFT_DURATION_MS).toString())
        storage.setItem("timpla_is_locked", "false")
        storage.removeItem(attemptsKey)
        
        return { success: true, message: `Welcome, ${staffMember.name}!` }
      }
    }

    // Failed attempt
    const attempts = parseInt(storage.getItem(attemptsKey, "0")) + 1
    if (attempts >= MAX_ATTEMPTS) {
      storage.setItem(lockoutKey, (Date.now() + LOCKOUT_DURATION_MS).toString())
      storage.setItem(attemptsKey, "0")
      return { success: false, message: "Too many failed attempts. Locked for 30s." }
    } else {
      storage.setItem(attemptsKey, attempts.toString())
      return { success: false, message: `Incorrect PIN. ${MAX_ATTEMPTS - attempts} attempts left.` }
    }
  }, [staffList])

  const unlock = useCallback(async (pin: string): Promise<{ success: boolean; message: string }> => {
    if (!user) return { success: false, message: "No user session." }
    return login(user.id, pin)
  }, [user, login])

  const logout = useCallback(() => {
    setUser(null)
    setIsLocked(false)
    storage.removeItem("timpla_current_user_id")
    storage.removeItem("timpla_session_expiry")
    storage.removeItem("timpla_is_locked")
  }, [])

  const switchUser = useCallback(() => {
    lock()
    setUser(null)
    storage.removeItem("timpla_current_user_id")
    storage.removeItem("timpla_session_expiry")
  }, [lock])

  const addStaff = useCallback(async (staffData: Omit<Staff, "id" | "avatarInitials">, pin: string): Promise<{ success: boolean; message: string }> => {
    const isAdmin = staffData.role === "admin"
    const currentAdmins = staffList.filter(s => s.role === "admin").length

    if (isAdmin && currentAdmins >= 3) {
      return { success: false, message: "Maximum 3 admin accounts allowed." }
    }

    const salt = await bcrypt.genSalt(10)
    const pin_hash = await bcrypt.hash(pin, salt)

    const { error } = await supabase
      .from('staff')
      .insert([{
        name: staffData.name,
        role: staffData.role,
        pin_hash,
        avatar_color: staffData.avatarColor,
        can_manage_menu: staffData.canManageMenu,
        can_manage_inventory: staffData.canManageInventory
      }])

    if (error) {
      return { success: false, message: "Failed to add staff: " + error.message }
    }

    await fetchStaff()

    return { success: true, message: "Staff added successfully." }
  }, [staffList, fetchStaff])

  const deleteStaff = useCallback(async (staffId: string) => {
    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', staffId)

    if (error) {
      throw error
    }

    await fetchStaff()
  }, [fetchStaff])

  const updateStaff = useCallback(async (staffId: string, data: Partial<Staff>, pin?: string): Promise<{ success: boolean; message: string }> => {
    try {
      const updateData: any = {}
      
      if (data.name) updateData.name = data.name
      if (data.role) updateData.role = data.role
      if (data.avatarColor) updateData.avatar_color = data.avatarColor
      if (data.canManageMenu !== undefined) updateData.can_manage_menu = data.canManageMenu
      if (data.canManageInventory !== undefined) updateData.can_manage_inventory = data.canManageInventory

      if (pin) {
        const salt = await bcrypt.genSalt(10)
        updateData.pin_hash = await bcrypt.hash(pin, salt)
      }

      const { error } = await supabase
        .from('staff')
        .update(updateData)
        .eq('id', staffId)

      if (error) {
        return { success: false, message: "Failed to update staff: " + error.message }
      }

      await fetchStaff()
      
      // Update current user if they edited themselves
      if (user && user.id === staffId) {
        const updatedUser = (await storage.getStaff()).find(s => s.id === staffId)
        if (updatedUser) setUser(updatedUser)
      }

      return { success: true, message: "Staff updated successfully." }
    } catch (error: any) {
      return { success: false, message: "Error updating staff: " + error.message }
    }
  }, [user, fetchStaff])

  const verifyMasterPIN = useCallback((pin: string) => pin === MASTER_RECOVERY_PIN, [])

  const contextValue = useMemo(() => ({ 
    user, 
    staffList, 
    isLocked, 
    isInitialSetup,
    isLoading,
    login, 
    logout, 
    lock, 
    unlock, 
    addStaff, 
    updateStaff,
    deleteStaff,
    switchUser,
    verifyMasterPIN
  }), [user, staffList, isLocked, isInitialSetup, isLoading, login, logout, lock, unlock, addStaff, updateStaff, deleteStaff, switchUser, verifyMasterPIN])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
