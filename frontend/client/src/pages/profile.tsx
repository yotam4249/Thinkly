// src/pages/profile.tsx
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../store/hooks";
import { selectAuthUser } from "../store/slices/authSlice";
import { presignGet } from "../services/s3.service";
import { useEffect, useState } from "react";
import "../styles/profile.css";

// Fallback avatars
import maleAvatar from "../assets/male.svg";
import femaleAvatar from "../assets/female.svg";
import neutralAvatar from "../assets/neutral.svg";

const genderFallback = (gender?: string | null) => {
  const g = (gender ?? "other").toString().toLowerCase();
  if (g === "male") return maleAvatar;
  if (g === "female") return femaleAvatar;
  return neutralAvatar;
};

export default function Profile() {
  const navigate = useNavigate();
  const user = useAppSelector(selectAuthUser);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);

  // Load profile image
  useEffect(() => {
    // Reset error state when user changes
    setAvatarError(false);
    setAvatarUrl(null);

    if (!user?.profileImage) {
      // No profile image - will use fallback
      return;
    }

    // If we already have a URL, use it
    if (user.profileImageUrl) {
      setAvatarUrl(user.profileImageUrl);
      return;
    }

    // Otherwise, presign the S3 key
    if (user.profileImage && typeof user.profileImage === "string") {
      if (/^https?:\/\//i.test(user.profileImage)) {
        setAvatarUrl(user.profileImage);
      } else {
        presignGet(user.profileImage)
          .then((url) => {
            setAvatarUrl(url);
            setAvatarError(false);
          })
          .catch(() => {
            setAvatarError(true);
            setAvatarUrl(null);
          });
      }
    }
  }, [user?.profileImage, user?.profileImageUrl, user?.id]);

  if (!user) {
    return (
      <div className="profile-screen">
        <div className="profile-card">
          <p>Please log in to view your profile.</p>
          <button className="btn-primary" onClick={() => navigate("/login")}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Get the appropriate fallback avatar based on gender
  const fallbackAvatar = genderFallback(user.gender);
  
  // Determine which avatar to use:
  // - If there's a valid S3 image (profileImage exists, avatarUrl is set, and no error), use it
  // - Otherwise, use the gender-based fallback
  const hasValidS3Image = user.profileImage && avatarUrl && !avatarError;
  const finalAvatarSrc = hasValidS3Image ? avatarUrl : fallbackAvatar;
  
  // Debug logging (remove in production)
  console.log("Profile avatar debug:", {
    hasProfileImage: !!user.profileImage,
    avatarUrl,
    avatarError,
    gender: user.gender,
    fallbackAvatar,
    finalAvatarSrc,
    hasValidS3Image,
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not provided";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatGender = (gender?: string | null) => {
    if (!gender) return "Not provided";
    return gender
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="profile-screen">
      <div className="profile-card">
        <header className="profile-header">
          <h1 className="profile-title">My Profile</h1>
          <button className="btn-ghost back-btn" onClick={() => navigate("/home")}>
            ← Back to Home
          </button>
        </header>

        <div className="profile-content">
          <div className="profile-avatar-section">
            <div className="avatar-container">
              <img
                key={`avatar-${user.id}`}
                src={finalAvatarSrc}
                alt="Profile"
                className="profile-avatar"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
                onError={(e) => {
                  console.error("Avatar image failed to load. Src was:", e.currentTarget.src);
                  console.error("Trying fallback:", fallbackAvatar);
                  // Force fallback
                  if (e.currentTarget.src !== fallbackAvatar) {
                    setAvatarError(true);
                    setAvatarUrl(null);
                    e.currentTarget.src = fallbackAvatar;
                    e.currentTarget.onerror = null; // Prevent infinite loop
                  }
                }}
                onLoad={() => {
                  console.log("✓ Avatar loaded:", finalAvatarSrc);
                }}
              />
            </div>
          </div>

          <div className="profile-info">
            <div className="info-row">
              <span className="info-label">Username</span>
              <span className="info-value">{user.username}</span>
            </div>

            <div className="info-row">
              <span className="info-label">Date of Birth</span>
              <span className="info-value">{formatDate(user.dateOfBirth)}</span>
            </div>

            <div className="info-row">
              <span className="info-label">Gender</span>
              <span className="info-value">{formatGender(user.gender)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

