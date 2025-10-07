
Travel Story Manager

This is a travel story management application where users can:  
✅ Store travel experiences with timestamps.  
✅ Mark stories as favorites for quick access.  
✅ Filter stories based on dates.  

Privacy & Authentication
To ensure user privacy, we have implemented authentication:  
- Signup Page: Stores user information in a JSON file (temporary storage).  
- Login Page: Reads user data from the JSON file and verifies credentials using JWT tokens.  

Technology Stack  
Frontend**  
🚀 React.js – Component-based UI development  
🎨 Tailwind CSS – Styling and responsiveness  
⚡ Vite – Fast development and build tool  

Backend  
🛠 Express.js – Handles API requests  
🔄 Nodemon – Automatically restarts the server on file changes (no need to refresh manually)  
🌐 CORS – Enables secure cross-origin requests  

Current API Endpoints  
The backend currently supports the following five endpoints:  
1️⃣ POST /add-stories – Add a new travel story.  
2️⃣ GET /get-all-stories – Retrieve all stored stories.  
3️⃣ POST /upload-images – Upload images related to a story.  
4️⃣ POST /create-account – Register a new user.  
5️⃣ POST /login – Authenticate and log in a user.  

Future Enhancements  
🔹 Database Integration: User data and stories will be stored in MongoDB instead of JSON files.  
🔹 Frontend Development: The UI is currently under development.  

Would you like any further refinements? 🚀
