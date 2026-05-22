import axios from "axios";
import { toast } from "sonner";

// Use environment variable or fallback to local backend port 4000
const baseURL = import.meta.env.VITE_PUBLIC_API_URL || "http://localhost:4000";

export const apiClient = axios.create({
  baseURL,
  withCredentials: true, // Crucial for httpOnly JWT cookie sharing
});

// Response interceptors to handle global API errors elegantly
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      // Unauthorized: Redirect to login page and clean up any local states
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    } else if (status === 423) {
      // Locked: The reveal time has not yet arrived
      toast.error("Reveal Locked", {
        description: "This bid cannot be unsealed until the tender deadline expires.",
      });
    } else if (status === 403) {
      // Forbidden: Submission closed
      toast.error("Submission Closed", {
        description: error.response?.data?.message || "The submission deadline for this tender has passed.",
      });
    } else if (status === 400) {
      // Bad Request: Commitment or validation mismatch
      const errMsg = error.response?.data?.message || "";
      if (errMsg.toLowerCase().includes("commitment") || errMsg.toLowerCase().includes("salt")) {
        toast.error("Commitment Mismatch", {
          description: "The submitted cryptographic commitment and salt do not match the expected values.",
        });
      } else {
        toast.error("Invalid Request", {
          description: errMsg || "The request could not be processed due to validation errors.",
        });
      }
    }

    return Promise.reject(error);
  }
);
