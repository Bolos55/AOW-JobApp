// src/EmployerView.jsx
import { useState, useEffect, useMemo, useRef } from "react";
import {
  User as UserIcon,
  Plus,
  Users,
  CheckCircle,
  Building2,
  RefreshCw,
  AlertTriangle,
  Filter,
  Briefcase,
  X,
  MessageCircle,
  Lock,
} from "lucide-react";

import { API_BASE, authHeader } from "./api";
import { getPhotoUrl } from "./utils/imageUtils";
import AddJobModal from "./components/AddJobModal";
import ReviewSection from "./components/ReviewSection";
import ChatWidget from "./components/ChatWidget"; // ? ???????????
import ServiceFeeModal from "./components/ServiceFeeModal"; // ? ??????????? Service Fee Modal
import PaymentHistory from "./components/PaymentHistory"; // ? ????? Payment History

export default function EmployerView({ user, onLogout }) {
  const [myJobs, setMyJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [openAddJob, setOpenAddJob] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // filter ????????
  const [statusFilter, setStatusFilter] = useState("all"); // all | pending | hired | rejected
  const [jobFilter, setJobFilter] = useState("all"); // all ???? job._id

  // modal state
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);

  // ???????????????????????
  const [updatingAppId, setUpdatingAppId] = useState(null);

  // state ????????????????????
  const [openChat, setOpenChat] = useState(false);
  const [chatTarget, setChatTarget] = useState(null);

  // ? ??????????????? (??? ChatWidget ?????? JobSeeker)
  const [adminChatOpen, setAdminChatOpen] = useState(false);

  // ? State ?????? modal ???????????????????
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);
  const [adminUnread, setAdminUnread] = useState(0);

  // ? Service Fee Modal state
  const [serviceFeeModalOpen, setServiceFeeModalOpen] = useState(false);
  const [selectedJobForServiceFee, setSelectedJobForServiceFee] = useState(null);
  const [paymentHistoryOpen, setPaymentHistoryOpen] = useState(false);

  // ? Track component mount status
  const mountedRef = useRef(true);

  const token = localStorage.getItem("token") || "";

  // ? Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const last = localStorage.getItem("adminChat:lastOpen");
    setAdminChatOpen(last === "1");
  }, []);
  useEffect(() => {
    localStorage.setItem("adminChat:lastOpen", adminChatOpen ? "1" : "0");
  }, [adminChatOpen]);

  // ???? dashboard
  const loadDashboard = async () => {
    if (!mountedRef.current) return;
    
    try {
      setLoading(true);
      setError("");

      const headers = {
        "Content-Type": "application/json",
        ...authHeader(),
      };

      // ??????????????
      const jobsRes = await fetch(`${API_BASE}/api/employer/my-jobs`, {
        headers,
      });
      if (jobsRes.ok) {
        const data = await jobsRes.json().catch(() => []);
        if (mountedRef.current) {
          setMyJobs(Array.isArray(data) ? data : []);
        }
      } else {
        console.error("???? my-jobs ??????:", jobsRes.status);
        if (mountedRef.current) {
          setMyJobs([]);
          setError("??????????????????????");
        }
      }

      // ????????????????????????
      const appsRes = await fetch(
        `${API_BASE}/api/employer/my-applications-received`,
        { headers }
      );
      if (appsRes.ok) {
        const data = await appsRes.json().catch(() => []);
        if (mountedRef.current) {
          setApplications(Array.isArray(data) ? data : []);
        }
      } else {
        console.error("???? my-applications-received ??????:", appsRes.status);
        if (mountedRef.current) {
          setApplications([]);
          setError((prev) => prev || "???????????????????????????");
        }
      }
    } catch (err) {
      console.error("???? dashboard ??????????:", err);
      if (mountedRef.current) {
        setMyJobs([]);
        setApplications([]);
        setError("????????????????????????????????");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // ???????????????????????? Modal
  const handleJobCreated = () => {
    setOpenAddJob(false);
    loadDashboard();
    // ? ???? modal ??????????????????????
    setTimeout(() => {
      setShowPaymentInfo(true);
    }, 300); // ????? modal ???????????????
  };

  // ????????????? applications
  const { totalPending, totalHired } = useMemo(() => {
    let pending = 0;
    let hired = 0;

    applications.forEach((a) => {
      const status = a.status || "pending";
      if (status === "pending") pending++;
      else if (status === "hired") hired++;
    });

    return { totalPending: pending, totalHired: hired };
  }, [applications]);

  // filter ??????????????
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const status = app.status || "pending";
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (jobFilter !== "all" && app.job?._id !== jobFilter) return false;
      return true;
    });
  }, [applications, statusFilter, jobFilter]);

  // ????/??? Modal ?????????????
  const openJobDetail = (job) => setSelectedJob(job);
  const closeJobDetail = () => setSelectedJob(null);

  // ????/??? Modal ??????????????????
  const openApplicationDetail = (app) => setSelectedApplication(app);
  const closeApplicationDetail = () => setSelectedApplication(null);

  // ??????????????????
  const updateApplicationStatus = async (app, newStatus) => {
    if (!app?._id) return;
    if (app.status === newStatus) return;
    if (!mountedRef.current) return;

    // ? ???????????????????????? ??????????????????????????????
    if (newStatus === "hired" && !app.idVerified) {
      alert("?? ????????????????????????\n\n??????: ???????????????????????????????????????????????????????????\n\n?????????????????????????????????????? ?????????????????????????????????????");
      return;
    }

    const confirmText =
      newStatus === "hired"
        ? "??????????????????????????????????????????"
        : "????????????????????????????????????";

    if (!window.confirm(confirmText)) return;

    try {
      setUpdatingAppId(app._id);

      const res = await fetch(
        `${API_BASE}/api/employer/applications/${app._id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...authHeader(),
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        
        // ? ?????? error message ????????????????????????????????????????????????
        if (errorData.requiresIdVerification) {
          if (mountedRef.current) {
            alert("?? " + errorData.message + "\n\n?????????????????????????????????????????????????????????????");
          }
        } else {
          if (mountedRef.current) {
            alert(errorData.message || "???????????????????? ????????????");
          }
        }
        return;
      }

      const updated = await res.json().catch(() => null);

      if (mountedRef.current) {
        setApplications((prev) =>
          prev.map((p) =>
            p._id === app._id
              ? { ...p, ...(updated || {}), status: newStatus }
              : p
          )
        );

        setSelectedApplication((prev) =>
          prev && prev._id === app._id
            ? { ...prev, ...(updated || {}), status: newStatus }
            : prev
        );

        // ?????????????????
        if (newStatus === "hired") {
          alert("? ?????????????????????????!");
        } else if (newStatus === "rejected") {
          alert("? ???????????????????????????");
        }
      }

    } catch (err) {
      console.error("error updateApplicationStatus:", err);
      if (mountedRef.current) {
        alert("???????????????????????????????????????");
      }
    } finally {
      if (mountedRef.current) {
        setUpdatingAppId(null);
      }
    }
  };

  // ??????
  const closeJob = async (job) => {
    if (!job?._id) return;
    if (!window.confirm(`???????????? "${job.title}" ????????`)) return;
    if (!mountedRef.current) return;

    try {
      const res = await fetch(`${API_BASE}/api/employer/jobs/${job._id}/close`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
      });

      if (!res.ok) {
        console.error("???????????????:", res.status);
        if (mountedRef.current) {
          alert("??????????????? ????????????");
        }
        return;
      }

      const updated = await res.json().catch(() => null);
      console.log("? Close job response:", updated);
      
      if (!updated || !mountedRef.current) return;

      // ? ?????? state ??????????? isCompleted = true
      const updatedJob = { ...job, ...updated, isCompleted: true };
      
      setMyJobs((prev) =>
        prev.map((j) => (j._id === job._id ? updatedJob : j))
      );

      setSelectedJob((prev) =>
        prev && prev._id === job._id ? updatedJob : prev
      );
      
      alert("???????????????????");
    } catch (err) {
      console.error("closeJob error:", err);
      if (mountedRef.current) {
        alert("???????????????????????????????????????");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 md:p-6">
        <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">?? ??????, {user?.name || "???????"}</h1>
            <p className="text-xs md:text-sm opacity-90">??????? - ????????????????????</p>
          </div>

          <div className="flex items-center gap-1 md:gap-2 flex-wrap">
            {/* ? ?????????????????????? */}
            <button
              onClick={() => setPaymentHistoryOpen(true)}
              className="bg-white/20 hover:bg-white/30 px-2 md:px-4 py-2 rounded-lg flex items-center gap-1 md:gap-2 text-xs md:text-sm"
              title="??????????????????"
            >
              <span className="text-base md:text-lg">??</span>
              <span className="hidden sm:inline">??????????????????</span>
            </button>

            {/* ? ??????????? */}
            <button
              onClick={() => setAdminChatOpen(true)}
              className="relative bg-white/20 hover:bg-white/30 px-2 md:px-4 py-2 rounded-lg flex items-center gap-1 md:gap-2 text-xs md:text-sm"
              title="???????"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">???????</span>
              {adminUnread > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] bg-red-500 text-white rounded-full px-1">
                  {adminUnread > 9 ? "9+" : adminUnread}
                </span>
              )}
            </button>

            {/* ???? Refresh */}
            <button
              onClick={loadDashboard}
              className="bg-white/20 hover:bg-white/30 px-2 md:px-4 py-2 rounded-lg flex items-center gap-1 md:gap-2 text-xs md:text-sm"
              disabled={loading}
              title="????????????"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">????????????</span>
            </button>

            <button
              onClick={onLogout}
              className="bg-white/20 hover:bg-white/30 px-2 md:px-4 py-2 rounded-lg flex items-center gap-1 md:gap-2 text-xs md:text-sm"
              title="??????????"
            >
              <UserIcon className="w-4 h-4" />
              <span className="hidden sm:inline">??????????</span>
            </button>
          </div>
        </div>

        {/* ???????? AddJobModal */}
        <button
          onClick={() => setOpenAddJob(true)}
          className="bg-white text-purple-600 px-4 md:px-6 py-2 md:py-3 rounded-lg font-medium flex items-center gap-2 hover:bg-purple-50 text-sm md:text-base w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4 md:w-5 md:h-5" /> ?????????????
        </button>

        {/* ???????????????? / error */}
        <div className="mt-3">
          {loading && <p className="text-xs opacity-80">?????????????????????????????...</p>}
          {error && !loading && (
            <div className="mt-2 bg-red-500/70 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Modal ???????????? */}
      <AddJobModal
        open={openAddJob}
        onClose={() => setOpenAddJob(false)}
        onCreated={handleJobCreated}
      />

      {/* Modal ????????????? */}
      <JobDetailModal open={!!selectedJob} job={selectedJob} onClose={closeJobDetail} />

      {/* Modal ?????????????????/???????? */}
      <ApplicationDetailModal
        open={!!selectedApplication}
        app={selectedApplication}
        onClose={closeApplicationDetail}
        onUpdateStatus={updateApplicationStatus}
        updatingAppId={updatingAppId}
      />

      {/* Modal ?????????????? */}
      <ChatModal
        open={openChat}
        app={chatTarget}
        user={user}
        onClose={() => setOpenChat(false)}
        onContactAdmin={() => {
          setOpenChat(false);
          setAdminChatOpen(true);
        }}
      />

      <div className="p-6 space-y-6">
        {/* ????? */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500 uppercase">???????????</p>
              <p className="text-2xl font-bold">{myJobs.length}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border flex items-center gap-3">
            <Users className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-xs text-gray-500 uppercase">???????????????</p>
              <p className="text-2xl font-bold">{applications.length}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-xs text-gray-500 uppercase">????????????????</p>
              <p className="text-2xl font-bold">{totalHired}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-xs text-gray-500 uppercase">?????????</p>
              <p className="text-2xl font-bold">{totalPending}</p>
            </div>
          </div>
        </div>

        {/* ????????? */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-purple-600" />
                ??????????????
              </h2>
              {/* ???? info */}
              <button
                onClick={() => setShowPaymentInfo(true)}
                className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 transition animate-pulse hover:animate-none"
                title="??????????????????????????"
                style={{
                  animation: 'heartbeat 1.5s ease-in-out infinite'
                }}
              >
                <span className="text-sm font-bold">i</span>
              </button>
              <style>{`
                @keyframes heartbeat {
                  0%, 100% {
                    transform: scale(1);
                  }
                  10%, 30% {
                    transform: scale(1.1);
                  }
                  20%, 40% {
                    transform: scale(1);
                  }
                }
              `}</style>
            </div>
            <p className="text-xs text-gray-500">
              ????????: ???? "????????????????" ????? filter ????????
            </p>
          </div>

          {myJobs.length === 0 ? (
            <p className="text-sm text-gray-400">???????????????????</p>
          ) : (
            <div className="space-y-3">
              {myJobs.map((job) => {
                const isClosed = !!job.isCompleted;
                return (
                  <div
                    key={job._id}
                    className="bg-white p-4 rounded-lg border hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold">{job.title}</h3>
                          {isClosed && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                              <Lock className="w-3 h-3" />
                              ???????????????
                            </span>
                          )}
                          {/* ? Boost Status - ????????????????????????? boost */}
                          {!isClosed && job.isPaid && job.boostFeatures && job.boostFeatures.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 border border-orange-200">
                              ? ???????
                            </span>
                          )}
                          {!isClosed && (!job.isPaid || !job.boostFeatures || job.boostFeatures.length === 0) && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                              ?? ????
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{job.company || "????????????"}</p>
                        {job.location && (
                          <p className="text-xs text-gray-500 mt-1">
                            ????????????: {job.location}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          ????????: {job.applicantCount || 0} ??
                        </p>
                        {/* ? Package Info */}
                        {job.packageType && (
                          <p className="text-xs text-purple-600 mt-1">
                            ???????: {job.packageType} {job.boostFeatures?.length > 0 && `+ ${job.boostFeatures.length} boost`}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <button
                          className="text-blue-600 text-sm hover:underline"
                          onClick={() => openJobDetail(job)}
                        >
                          ????????????
                        </button>

                        {/* ? Payment Button */}
                        {!job.isPaid && !isClosed && (
                          <button
                            onClick={() => {
                              setSelectedJobForServiceFee(job);
                              setServiceFeeModalOpen(true);
                            }}
                            className="text-xs px-3 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-1"
                          >
                            ?? ????????
                          </button>
                        )}

                        <button
                          className={`text-xs px-3 py-1 rounded-full border ${
                            jobFilter === job._id
                              ? "bg-blue-50 text-blue-700 border-blue-300"
                              : "bg-gray-50 text-gray-600 border-gray-200"
                          }`}
                          onClick={() =>
                            setJobFilter((prev) => (prev === job._id ? "all" : job._id))
                          }
                        >
                          {jobFilter === job._id ? "??????????????????" : "????????????????"}
                        </button>

                        {!isClosed && (
                          <button
                            onClick={() => closeJob(job)}
                            className="text-xs mt-1 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-gray-800 text-white hover:bg-black"
                          >
                            <Lock className="w-3 h-3" />
                            ?????????
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ???????? + filter */}
        <div>
          <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              ????????
              <span className="text-xs font-normal text-gray-500">
                ({filteredApplications.length} ????????????? filter)
              </span>
            </h2>

            <div className="flex items-center gap-2 text-sm">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-md px-2 py-1 text-sm"
              >
                <option value="all">?????: ???????</option>
                <option value="pending">?????????</option>
                <option value="hired">????????????</option>
                <option value="rejected">??????</option>
              </select>

              <select
                value={jobFilter}
                onChange={(e) => setJobFilter(e.target.value)}
                className="border rounded-md px-2 py-1 text-sm"
              >
                <option value="all">???: ??????</option>
                {myJobs.map((job) => (
                  <option key={job._id} value={job._id}>
                    {job.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ? ?????????????????????????????????????????? */}
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-blue-800 mb-1">?? ?????????????</p>
                <p className="text-blue-700">
                  ??????????????????????????????????????????? <strong>?????????????????????????????????????????????????</strong>
                </p>
                <p className="text-blue-600 text-xs mt-1">
                  ?? ?????????????????????????????? ???????????? "????????????" ?????????
                </p>
              </div>
            </div>
          </div>

          {applications.length === 0 ? (
            <p className="text-sm text-gray-400">
              ???????????????? (??????????????????? ??)
            </p>
          ) : filteredApplications.length === 0 ? (
            <p className="text-sm text-gray-400">?????????????????????????????? filter</p>
          ) : (
            <div className="space-y-2">
              {filteredApplications.slice(0, 50).map((app) => {
                const status = app.status || "pending";
                const isUpdating = updatingAppId === app._id;
                const isClosed = !!app.job?.isCompleted; // ? ????????????????????????????????

                const applicantPhoto = getPhotoUrl(app.applicant?.profile) || app.applicant?.avatar || "";

                return (
                  <div
                    key={app._id}
                    className="bg-white p-4 rounded-lg border flex justify-between items-center gap-4"
                  >
                    <div className="flex-1 flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {applicantPhoto ? (
                          <img
                            src={applicantPhoto}
                            alt={app.applicant?.name || "????????"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </div>

                      <div className="flex-1">
                        <p className="font-semibold">{app.applicant?.name || "????????"}</p>
                        <p className="text-sm text-gray-600">
                          ?????: {app.job?.title || "-"}
                        </p>
                        
                        {/* ? ????????????????????????????? */}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">???????????:</span>
                          {app.idVerified ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                              ? ??????????
                            </span>
                          ) : app.idCardPath ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                              ? ???????????????
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              ? ?????????????
                            </span>
                          )}
                        </div>
                        
                        <p className="text-xs text-gray-400 mt-1">
                          ????????:{" "}
                          {app.createdAt ? new Date(app.createdAt).toLocaleString('th-TH', {
                            year: 'numeric',
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : "-"}
                        </p>

                        <button
                          className="mt-2 text-xs text-blue-600 hover:underline"
                          onClick={() => openApplicationDetail(app)}
                        >
                          ??????????????????? / ???????
                        </button>

                        <button
                          className="mt-4 inline-flex items-center gap-1 text-xs text-purple-600 hover:underline"
                          onClick={() => {
                            setChatTarget(app);
                            setOpenChat(true);
                          }}
                        >
                          <MessageCircle className="w-3 h-3" />
                          ??????????????
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          status === "hired"
                            ? "bg-green-100 text-green-700"
                            : status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {status}
                      </span>

                      {/* ? ????????????????????????????? */}
                      {!isClosed && (
                        <div className="flex gap-2">
                          {status !== "hired" && (
                            <button
                              disabled={isUpdating || !app.idVerified}
                              onClick={() => updateApplicationStatus(app, "hired")}
                              className={`text-xs px-3 py-1 rounded-lg text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed ${
                                app.idVerified ? "bg-green-500" : "bg-gray-400"
                              }`}
                              title={
                                !app.idVerified 
                                  ? "??????????????????????????????????" 
                                  : "????????????"
                              }
                            >
                              {isUpdating && status !== "hired" 
                                ? "???????????..." 
                                : app.idVerified 
                                  ? "????????????" 
                                  : "?????????????"
                              }
                            </button>
                          )}
                          {status !== "rejected" && (
                            <button
                              disabled={isUpdating}
                              onClick={() => updateApplicationStatus(app, "rejected")}
                              className="text-xs px-3 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                            >
                              {isUpdating && status !== "rejected" ? "???????????..." : "??????"}
                            </button>
                          )}
                        </div>
                      )}
                      
                      {/* ? ???????????????????????? */}
                      {isClosed && (
                        <p className="text-xs text-gray-500 italic">
                          ??????????????????
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ? ???????????????????? (??? ChatWidget) */}
      <ChatWidget
        open={adminChatOpen}
        onClose={() => setAdminChatOpen(false)}
        user={user}
        token={token}
        onUnreadChange={setAdminUnread}
      />

      {/* ? Modal ????????????????? */}
      {showPaymentInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative">
            <button
              onClick={() => setShowPaymentInfo(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-gray-800 mb-4">
              ?? ?????????????????
            </h2>

            <div className="space-y-4 text-sm">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">? ???????????!</h3>
                <p className="text-blue-800">
                  ????????????????????????????????????????? ??????????????????????????
                  ??????????????????????????????????????
                </p>
              </div>

              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="font-semibold text-orange-900 mb-2">? ?????????????????????</h3>
                <p className="text-orange-800 mb-3">
                  ????????????????????????????????????????? ??????????????????????????????????:
                </p>
                <ul className="space-y-2 text-orange-800">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500">•</span>
                    <span><strong>Featured:</strong> ???????????????????????????</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500">•</span>
                    <span><strong>Highlighted:</strong> ????????????????????</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500">•</span>
                    <span><strong>Urgent:</strong> ???????? "???????"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500">•</span>
                    <span><strong>Extended:</strong> ???????????????????</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">?? ????????</h3>
                <div className="space-y-2 text-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                      ?? ????
                    </span>
                    <span>= ?????? ???????????</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 border border-orange-200">
                      ? ???????
                    </span>
                    <span>= ????????????? boost ????</span>
                  </div>
                </div>
              </div>

              <div className="text-center pt-2">
                <p className="text-xs text-gray-500 mb-3">
                  ???????????????????? boost ????
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => {
                      setShowPaymentInfo(false);
                    }}
                    className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
                  >
                    ??????????
                  </button>
                  <button
                    onClick={() => {
                      setShowPaymentInfo(false);
                      // TODO: ???? modal ????????/boost
                    }}
                    className="px-6 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg font-medium hover:shadow-lg transition"
                  >
                    ????????????? Boost ???
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ? Service Fee Modal */}
      <ServiceFeeModal
        open={serviceFeeModalOpen}
        onClose={() => {
          setServiceFeeModalOpen(false);
          setSelectedJobForServiceFee(null);
        }}
        job={selectedJobForServiceFee}
        onServiceFeeSuccess={(serviceFeeData) => {
          // Refresh jobs list after successful service fee payment
          loadDashboard();
          setServiceFeeModalOpen(false);
          setSelectedJobForServiceFee(null);
          
          // Show success message
          alert(`?? ???????????????????!\n\n??? "${selectedJobForServiceFee?.title}" ????????????????????\n\n???????????: ${serviceFeeData.paymentId}`);
        }}
      />

      {/* ? Payment History Modal */}
      <PaymentHistory
        open={paymentHistoryOpen}
        onClose={() => setPaymentHistoryOpen(false)}
      />
    </div>
  );
}

/* ===== Modal ????????????????? ===== */
function JobDetailModal({ open, job, onClose }) {
  if (!open || !job) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-lg p-6 relative">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold mb-2">{job.title}</h3>
        <p className="text-sm text-gray-600 mb-1">{job.company || "????????????"}</p>

        {job.location && (
          <p className="text-sm text-gray-500 mb-2">????????????: {job.location}</p>
        )}

        {job.salary && (
          <p className="text-sm text-gray-500 mb-2">?????????: {job.salary}</p>
        )}

        <hr className="my-3" />

        <div className="text-sm text-gray-700 space-y-2">
          {job.description && (
            <div>
              <p className="font-semibold mb-1">?????????????</p>
              <p>{job.description}</p>
            </div>
          )}
          {job.requirements && (
            <div>
              <p className="font-semibold mb-1">?????????</p>
              <p>{job.requirements}</p>
            </div>
          )}
        </div>

        {/* ? ?????????????? */}
        <div className="mt-4">
          <p className="font-semibold text-gray-700 mb-2">?? ??????????????</p>
          
          {job?.workplacePhotos && job.workplacePhotos.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                {job.workplacePhotos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo}
                      alt={`?????? ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition"
                      onClick={() => window.open(photo, '_blank')}
                      onError={(e) => {
                        console.error("Failed to load image:", photo);
                        e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="10">??????????</text></svg>';
                      }}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">???????????????????</p>
            </>
          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500">???????????????????</p>
            </div>
          )}
        </div>

        <hr className="my-4" />
        <div className="text-sm">
          <p className="font-semibold mb-2">???????????????? / ??????????????????</p>
          <ReviewSection jobId={job._id} isJobOwner={true} />
        </div>
      </div>
    </div>
  );
}

/* ===== Modal ????????????????????? / ??????????????? ===== */
function ApplicationDetailModal({ open, app, onClose, onUpdateStatus, updatingAppId }) {
  if (!open || !app) return null;

  const status = app.status || "pending";
  const isUpdating = updatingAppId === app._id;

  const applicantPhoto = getPhotoUrl(app.applicant?.profile) || app.applicant?.avatar || "";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-lg p-6 relative">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
            {applicantPhoto ? (
              <img
                src={applicantPhoto}
                alt={app.applicant?.name || "????????"}
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon className="w-6 h-6 text-gray-400" />
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold mb-1">{app.applicant?.name || "????????"}</h3>
            <p className="text-sm text-gray-600">????????: {app.job?.title || "-"}</p>
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-3">
          ????????: {app.createdAt ? new Date(app.createdAt).toLocaleString('th-TH', {
            year: 'numeric',
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) : "-"}
        </p>

        <span
          className={`inline-block text-xs px-2 py-1 rounded-full mb-3 ${
            status === "hired"
              ? "bg-green-100 text-green-700"
              : status === "rejected"
              ? "bg-red-100 text-red-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          ?????: {status}
        </span>

        {/* ? ????????????????????????????? */}
        <div className="mb-3">
          <span className="text-xs text-gray-600 mr-2">????????????????????:</span>
          {app.idVerified ? (
            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
              ? ???????????????????
            </span>
          ) : app.idCardPath ? (
            <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
              ? ???????????????
            </span>
          ) : (
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
              ? ?????????????????
            </span>
          )}
        </div>

        {/* ? ???????????????????????????????????? */}
        {!app.idVerified && (
          <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              ?? <strong>????????:</strong> ??????????????????????????????????????????????????????????????????
            </p>
          </div>
        )}

        <div className="space-y-3 text-sm text-gray-700">
          {/* ? ????????????????????? */}
          {app.applicant?.profile && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
              <p className="font-semibold text-blue-800 mb-2">?? ?????????????</p>
              
              {app.applicant.profile.fullName && (
                <div className="mb-2">
                  <span className="text-xs text-blue-600 font-medium">????-???????:</span>
                  <p className="text-sm text-blue-800">{app.applicant.profile.fullName}</p>
                </div>
              )}
              
              {app.applicant.profile.headline && (
                <div className="mb-2">
                  <span className="text-xs text-blue-600 font-medium">?????????????????:</span>
                  <p className="text-sm text-blue-800">{app.applicant.profile.headline}</p>
                </div>
              )}
              
              {app.applicant.profile.location && (
                <div className="mb-2">
                  <span className="text-xs text-blue-600 font-medium">???????/????????????:</span>
                  <p className="text-sm text-blue-800">{app.applicant.profile.location}</p>
                </div>
              )}
              
              {app.applicant.profile.skillsText && (
                <div className="mb-2">
                  <span className="text-xs text-blue-600 font-medium">?????:</span>
                  <p className="text-sm text-blue-800 whitespace-pre-line">{app.applicant.profile.skillsText}</p>
                </div>
              )}
              
              {app.applicant.profile.experience && (
                <div className="mb-2">
                  <span className="text-xs text-blue-600 font-medium">??????????:</span>
                  <p className="text-sm text-blue-800 whitespace-pre-line max-h-32 overflow-y-auto">{app.applicant.profile.experience}</p>
                </div>
              )}
            </div>
          )}

          {app.coverLetter && (
            <div>
              <p className="font-semibold mb-1">Cover Letter</p>
              <p className="whitespace-pre-line">{app.coverLetter}</p>
            </div>
          )}

          {app.resumeUrl && (
            <div>
              <p className="font-semibold mb-1">???????</p>
              <a
                href={app.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 text-sm hover:underline"
              >
                ?????????????????????
              </a>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          {status !== "hired" && (
            <button
              disabled={isUpdating || !app.idVerified}
              onClick={() => onUpdateStatus(app, "hired")}
              className={`text-xs px-3 py-2 rounded-lg text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed ${
                app.idVerified ? "bg-green-500" : "bg-gray-400"
              }`}
              title={
                !app.idVerified 
                  ? "??????????????????????????????????" 
                  : "????????????"
              }
            >
              {isUpdating && status !== "hired" 
                ? "???????????..." 
                : app.idVerified 
                  ? "????????????" 
                  : "?????????????"
              }
            </button>
          )}
          {status !== "rejected" && (
            <button
              disabled={isUpdating}
              onClick={() => onUpdateStatus(app, "rejected")}
              className="text-xs px-3 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
            >
              {isUpdating && status !== "rejected" ? "???????????..." : "??????"}
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs px-3 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            ???
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== Modal ?????????????? (????????????????????????) ===== */
function ChatModal({ open, app, user, onClose, onContactAdmin }) {

  const [thread, setThread] = useState(null);

  const [messages, setMessages] = useState([]);

  const [newMessage, setNewMessage] = useState("");

  const [loading, setLoading] = useState(false);

  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);



  // Load or create thread when modal opens

  useEffect(() => {

    if (open && (app?.job?._id || app?.jobId) && (app?.applicant?._id || app?.applicant)) {

      initializeChat();

    }

    // eslint-disable-next-line react-hooks/exhaustive-deps`n  }, [open, app]);



  // Auto scroll to bottom

  useEffect(() => {

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  }, [messages]);



  const initializeChat = async () => {

    setLoading(true);

    try {

      // Import chat API

      const { ensureThread, fetchMessages } = await import("./api/chat");

      

      // ? ?????: ??? app.job._id ??? app.jobId

      const jobId = app.job?._id || app.jobId;

      const applicantId = app.applicant?._id || app.applicant;

      

      if (!jobId || !applicantId) {

        throw new Error("??????????????????????????");

      }

      

      // Create or get existing thread

      const threadData = await ensureThread({

        jobId,

        participantId: applicantId,

        token: localStorage.getItem("token")

      });

      

      setThread(threadData);

      

      // Load messages

      if (threadData._id) {

        const msgs = await fetchMessages({

          threadId: threadData._id,

          token: localStorage.getItem("token")

        });

        setMessages(msgs || []);

      }

    } catch (err) {

      console.error("Initialize chat error:", err);

      

      // ? ??????????? trial expired ???????

      if (err.message && err.message.includes("?????????")) {

        // ???? error ????????? modal ????????????????????????

        setThread({ trialExpired: true });

      } else {

        alert("???????????????????????: " + err.message);

      }

    } finally {

      setLoading(false);

    }

  };



  const handleSendMessage = async (e) => {

    e.preventDefault();

    if (!newMessage.trim() || sending) return;

    

    // ? ??????????? thread ?????? initialize ????

    if (!thread?._id) {

      console.log("No thread ID, trying to initialize...");

      await initializeChat();

      return;

    }



    setSending(true);

    try {

      const { sendMessage } = await import("./api/chat");

      

      const result = await sendMessage({

        threadId: thread._id,

        text: newMessage.trim(),

        token: localStorage.getItem("token")

      });

      

      // Add new message to list

      setMessages([...messages, result]);

      setNewMessage("");

    } catch (err) {

      console.error("Send message error:", err);

      alert("???????????????????: " + err.message);

    } finally {

      setSending(false);

    }

  };



  if (!open || !app) return null;



  return (

    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">

      <div className="bg-white w-full max-w-md rounded-2xl shadow-lg flex flex-col max-h-[80vh]">

        {/* Header */}

        <div className="flex items-center justify-between p-4 border-b">

          <div className="flex items-center gap-2">

            <MessageCircle className="w-5 h-5 text-purple-600" />

            <h3 className="font-bold">?????? {app.applicant?.name || "????????"}</h3>

          </div>

          <div className="flex items-center gap-2">

            <button

              onClick={onContactAdmin}

              className="text-xs px-3 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"

            >

              ????????????

            </button>

            <button

              onClick={onClose}

              className="text-gray-400 hover:text-gray-600"

            >

              <X className="w-5 h-5" />

            </button>

          </div>

        </div>



        {/* Messages */}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">

          {/* ? Trial Expired Warning */}

          {thread?.trialExpired && (

            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 text-center">

              <Lock className="w-12 h-12 text-orange-500 mx-auto mb-2" />

              <h4 className="font-bold text-orange-900 mb-1">??????????????? 24 ??. ???????</h4>

              <p className="text-sm text-orange-700 mb-3">

                ????????????????????????????????????????

              </p>

              <button

                onClick={() => {

                  // ???? ServiceFeeModal

                  onClose();

                  // TODO: ???? payment modal

                }}

                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"

              >

                ???????????????????

              </button>

            </div>

          )}

          

          {/* ? Trial Warning (????????????????? 6 ??.) */}

          {thread?.trialInfo && thread.trialInfo.isInTrial && thread.trialInfo.timeRemaining < 6 * 60 * 60 * 1000 && (

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">

              <p className="text-xs text-yellow-800">

                ?? ????????????????????????? {Math.floor(thread.trialInfo.timeRemaining / (60 * 60 * 1000))} ??.

              </p>

              <p className="text-xs text-yellow-700 mt-1">

                ???????????????????????????????????

              </p>

            </div>

          )}



          {loading ? (

            <div className="text-center py-8">

              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>

              <p className="text-sm text-gray-500 mt-2">????????????????...</p>

            </div>

          ) : messages.length === 0 && !thread?.trialExpired ? (

            <div className="text-center py-8">

              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />

              <p className="text-sm text-gray-500">???????????????</p>

              <p className="text-xs text-gray-400 mt-1">??????????????????????</p>

            </div>

          ) : (

            messages.map((msg, idx) => {

              const isMe = msg.senderId === user._id || msg.senderId?._id === user._id;

              return (

                <div key={idx} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>

                  <div className={`max-w-[70%] rounded-lg px-3 py-2 ${

                    isMe 

                      ? "bg-purple-600 text-white" 

                      : "bg-gray-100 text-gray-800"

                  }`}>

                    <p className="text-sm">{msg.text}</p>

                    <p className={`text-xs mt-1 ${isMe ? "text-purple-200" : "text-gray-500"}`}>

                      {new Date(msg.createdAt).toLocaleTimeString('th-TH', { 

                        hour: '2-digit', 

                        minute: '2-digit' 

                      })}

                    </p>

                  </div>

                </div>

              );

            })

          )}

          <div ref={messagesEndRef} />

        </div>



        {/* Input */}

        {!thread?.trialExpired && (

          <form onSubmit={handleSendMessage} className="p-4 border-t">

            <div className="flex gap-2">

              <input

                type="text"

                value={newMessage}

                onChange={(e) => setNewMessage(e.target.value)}

                placeholder="????????????..."

                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"

                disabled={sending || loading}

              />

              <button

                type="submit"

                disabled={!newMessage.trim() || sending || loading}

                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"

              >

                {sending ? "..." : "???"}

            </button>

          </div>

        </form>

        )}

      </div>

    </div>

  );

}
