// src/utils/authUtils.js

// Helper function เพื่ออัปเดต user ใน localStorage
export const updateUserInStorage = (updatedUser) => {
  try {
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const newUser = { ...currentUser, ...updatedUser };
    localStorage.setItem("user", JSON.stringify(newUser));
    
    // Dispatch event เพื่อให้ component อื่นรู้ว่า user เปลี่ยนแล้ว
    window.dispatchEvent(new Event("auth-change"));
    
    return newUser;
  } catch (error) {
    console.error("Error updating user in storage:", error);
    return null;
  }
};

// Helper function เพื่ออัปเดต profile ใน localStorage
export const updateProfileInStorage = (updatedProfile) => {
  try {
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const newUser = {
      ...currentUser,
      profile: {
        ...currentUser.profile,
        ...updatedProfile
      }
    };
    localStorage.setItem("user", JSON.stringify(newUser));
    
    // Dispatch event เพื่อให้ component อื่นรู้ว่า profile เปลี่ยนแล้ว
    window.dispatchEvent(new Event("auth-change"));
    
    return newUser;
  } catch (error) {
    console.error("Error updating profile in storage:", error);
    return null;
  }
};

// Helper function เพื่อดึง user จาก localStorage
export const getUserFromStorage = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch (error) {
    console.error("Error getting user from storage:", error);
    return null;
  }
};