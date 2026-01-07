// src/components/OnlineStatusWidget.jsx
import { useState, useEffect, useCallback } from "react";
import { Users, Eye, Clock, Smartphone, Monitor, Tablet, RefreshCw } from "lucide-react";
import { API_BASE, authHeader } from "../api";

export default function OnlineStatusWidget({ isAdmin = false }) {
  const [onlineData, setOnlineData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  const fetchOnlineStatus = useCallback(async () => {
    try {
      setError(null);
      const endpoint = isAdmin ? '/api/online/admin/dashboard' : '/api/online/status';
      const res = await fetch(`${API_BASE}${endpoint}`, {
        headers: authHeader()
      });

      if (res.ok) {
        const data = await res.json();
        setOnlineData(data);
        setLastUpdated(new Date());
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      console.error("Fetch online status error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]); // dependency: isAdmin

  useEffect(() => {
    fetchOnlineStatus();

    // Auto refresh ทุก 30 วินาที
    const interval = setInterval(fetchOnlineStatus, 30000);

    return () => clearInterval(interval);
  }, [fetchOnlineStatus]); // dependency: fetchOnlineStatus

  const getDeviceIcon = (deviceInfo) => {
    if (!deviceInfo) return <Monitor className="w-4 h-4" />;
    
    if (deviceInfo.isMobile) return <Smartphone className="w-4 h-4" />;
    if (deviceInfo.device === 'Tablet') return <Tablet className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

  const formatDuration = (ms) => {
    if (!ms || ms < 0) return '0น';
    
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}ช ${minutes % 60}น`;
    }
    return `${minutes}น`;
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'text-red-600 bg-red-100';
      case 'employer': return 'text-blue-600 bg-blue-100';
      case 'jobseeker': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'แอดมิน';
      case 'employer': return 'นายจ้าง';
      case 'jobseeker': return 'ผู้หางาน';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-red-600">
          <p className="text-sm">ไม่สามารถโหลดข้อมูลออนไลน์ได้</p>
          <button
            onClick={fetchOnlineStatus}
            className="text-xs text-blue-600 hover:underline mt-1"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    // Simple status for regular users
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">ออนไลน์</span>
        </div>
      </div>
    );
  }

  // Admin dashboard
  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold">ผู้ใช้ออนไลน์</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchOnlineStatus}
              className="p-1 hover:bg-gray-100 rounded"
              title="รีเฟรช"
            >
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-blue-600 hover:underline"
            >
              {showDetails ? 'ซ่อน' : 'ดูรายละเอียด'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {onlineData?.summary?.totalOnline || 0}
            </div>
            <div className="text-xs text-gray-500">ทั้งหมด</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              {onlineData?.summary?.byRole?.jobseeker || 0}
            </div>
            <div className="text-xs text-gray-500">ผู้หางาน</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">
              {onlineData?.summary?.byRole?.employer || 0}
            </div>
            <div className="text-xs text-gray-500">นายจ้าง</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-red-600">
              {onlineData?.summary?.byRole?.admin || 0}
            </div>
            <div className="text-xs text-gray-500">แอดมิน</div>
          </div>
        </div>

        {lastUpdated && (
          <div className="text-xs text-gray-500 text-center mb-4">
            อัปเดตล่าสุด: {lastUpdated.toLocaleTimeString('th-TH')}
          </div>
        )}

        {/* Online Users List */}
        {showDetails && onlineData?.onlineUsers && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <h4 className="font-medium text-gray-700 mb-2">ผู้ใช้ออนไลน์:</h4>
            
            {onlineData.onlineUsers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">ไม่มีผู้ใช้ออนไลน์</p>
            ) : (
              onlineData.onlineUsers.map((user) => (
                <div key={user.userId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  {/* Avatar */}
                  <div className="relative">
                    {user.photoUrl ? (
                      <img
                        src={user.photoUrl}
                        alt={user.name}
                        className="w-8 h-8 rounded-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center" style={{ display: user.photoUrl ? 'none' : 'flex' }}>
                      <span className="text-xs font-medium text-gray-600">
                        {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                      </span>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">{user.name || 'Unknown'}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span>{user.currentPage || '/'}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDuration(user.sessionDuration)}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {getDeviceIcon(user.deviceInfo)}
                        <span>{user.deviceInfo?.browser || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Activity Count */}
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-700">
                      {user.activityCount || 0}
                    </div>
                    <div className="text-xs text-gray-500">กิจกรรม</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Statistics */}
        {showDetails && onlineData?.statistics && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="font-medium text-gray-700 mb-2">สถิติ:</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">เซสชันทั้งหมด:</span>
                <span className="ml-2 font-medium">{onlineData.statistics.totalSessions || 0}</span>
              </div>
              <div>
                <span className="text-gray-500">เวลาออนไลน์เฉลี่ย:</span>
                <span className="ml-2 font-medium">
                  {formatDuration(onlineData.statistics.averageSessionTime)}
                </span>
              </div>
            </div>

            {onlineData.statistics.mostActiveUsers?.length > 0 && (
              <div className="mt-3">
                <span className="text-gray-500 text-sm">ผู้ใช้ที่มีกิจกรรมมากที่สุด:</span>
                <div className="mt-1 space-y-1">
                  {onlineData.statistics.mostActiveUsers.map((user, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span>{user.name || 'Unknown'}</span>
                      <span className="text-gray-500">{user.activityCount || 0} กิจกรรม</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}