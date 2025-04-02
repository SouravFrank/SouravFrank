<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sourav Sadhukhan - Futuristic Profile</title>
  <style>
    /* Basic reset and body styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #fff;
      overflow-x: hidden;
      line-height: 1.6;
      padding: 2rem;
    }
    h1, h3 {
      text-align: center;
      margin-bottom: 1rem;
      text-shadow: 0 0 10px rgba(255,255,255,0.2);
    }
    /* Container for futuristic card with glassmorphism effect */
    .card {
      max-width: 800px;
      margin: 2rem auto;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      backdrop-filter: blur(10px);
      padding: 2rem;
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
      border: 1px solid rgba(255, 255, 255, 0.18);
    }
    /* Profile image and links */
    .profile-img {
      display: block;
      margin: 0 auto 1rem;
      width: 150px;
      height: 150px;
      border-radius: 50%;
      border: 4px solid #0ff;
      box-shadow: 0 0 20px #0ff;
    }
    .profile-info {
      text-align: center;
    }
    .links {
      margin-top: 1rem;
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
    }
    .links a {
      margin: 0.5rem;
      display: inline-block;
      width: 40px;
      height: 40px;
      transition: transform 0.3s;
    }
    .links a:hover {
      transform: scale(1.2);
    }
    .languages {
      margin-top: 2rem;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 1rem;
    }
    .languages img {
      width: 40px;
      height: 40px;
      transition: transform 0.3s, filter 0.3s;
    }
    .languages img:hover {
      transform: rotate(360deg);
      filter: drop-shadow(0 0 10px #0ff);
    }
    /* Animated background grid (optional advanced feature) */
    .grid {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: linear-gradient(90deg, transparent 50%, rgba(255,255,255,0.05) 50%),
                        linear-gradient(transparent 50%, rgba(255,255,255,0.05) 50%);
      background-size: 50px 50px;
      pointer-events: none;
      animation: moveGrid 10s linear infinite;
      z-index: -1;
    }
    @keyframes moveGrid {
      0% { background-position: 0 0, 0 0; }
      100% { background-position: 50px 50px, 50px 50px; }
    }
    /* Footer animation for neon effect */
    .footer {
      text-align: center;
      margin-top: 3rem;
      font-size: 0.9rem;
      opacity: 0.8;
    }
  </style>
</head>
<body>
  <!-- Optional animated grid background -->
  <div class="grid"></div>
  
  <div class="card">
    <img src="https://avatars.githubusercontent.com/u/your_avatar_here?s=400" alt="Sourav Sadhukhan" class="profile-img" />
    <div class="profile-info">
      <h1>Hi 👋, I'm Sourav Sadhukhan</h1>
      <h3>A passionate frontend developer from India</h3>
      <p>
        Currently learning <strong>Data Structures & Algorithms</strong>.
      </p>
      <p>
        Ask me about <strong>React, JavaScript, React Native</strong>.
      </p>
      <p>
        Reach out at <strong>ssadhukhan990@gmail.com</strong>.
      </p>
      <p>
        <a href="https://souravfrank.github.io/about-me/" target="_blank" style="color: #0ff; text-decoration: underline;">Know more about my experiences</a>
      </p>
      <div class="links">
        <a href="https://linkedin.com/in/souravsadhukhan" target="_blank">
          <img src="https://raw.githubusercontent.com/rahuldkjain/github-profile-readme-generator/master/src/images/icons/Social/linked-in-alt.svg" alt="LinkedIn">
        </a>
        <a href="https://fb.com/ssadhukhan990" target="_blank">
          <img src="https://raw.githubusercontent.com/rahuldkjain/github-profile-readme-generator/master/src/images/icons/Social/facebook.svg" alt="Facebook">
        </a>
        <a href="https://instagram.com/frank_2282" target="_blank">
          <img src="https://raw.githubusercontent.com/rahuldkjain/github-profile-readme-generator/master/src/images/icons/Social/instagram.svg" alt="Instagram">
        </a>
        <a href="https://www.hackerrank.com/frank2282" target="_blank">
          <img src="https://raw.githubusercontent.com/rahuldkjain/github-profile-readme-generator/master/src/images/icons/Social/hackerrank.svg" alt="Hackerrank">
        </a>
        <a href="https://codeforces.com/profile/sourav_sadhukhan" target="_blank">
          <img src="https://cdn.jsdelivr.net/npm/simple-icons@3.0.1/icons/codeforces.svg" alt="Codeforces">
        </a>
        <a href="https://www.leetcode.com/souravsadhukhan" target="_blank">
          <img src="https://raw.githubusercontent.com/rahuldkjain/github-profile-readme-generator/master/src/images/icons/Social/leet-code.svg" alt="LeetCode">
        </a>
        <a href="https://www.hackerearth.com/@ssadhukhan990" target="_blank">
          <img src="https://raw.githubusercontent.com/rahuldkjain/github-profile-readme-generator/master/src/images/icons/Social/hackerearth.svg" alt="HackerEarth">
        </a>
      </div>
    </div>
    
    <div class="languages">
      <a href="https://www.w3schools.com/css/" target="_blank">
        <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/css3/css3-original-wordmark.svg" alt="CSS3">
      </a>
      <a href="https://expressjs.com" target="_blank">
        <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/express/express-original-wordmark.svg" alt="Express">
      </a>
      <a href="https://git-scm.com/" target="_blank">
        <img src="https://www.vectorlogo.zone/logos/git-scm/git-scm-icon.svg" alt="Git">
      </a>
      <a href="https://www.w3.org/html/" target="_blank">
        <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/html5/html5-original-wordmark.svg" alt="HTML5">
      </a>
      <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank">
        <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/javascript/javascript-original.svg" alt="JavaScript">
      </a>
      <a href="https://www.linux.org/" target="_blank">
        <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/linux/linux-original.svg" alt="Linux">
      </a>
      <a href="https://nodejs.org" target="_blank">
        <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/nodejs/nodejs-original-wordmark.svg" alt="NodeJS">
      </a>
      <a href="https://www.photoshop.com/en" target="_blank">
        <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/photoshop/photoshop-line.svg" alt="Photoshop">
      </a>
      <a href="https://postman.com" target="_blank">
        <img src="https://www.vectorlogo.zone/logos/getpostman/getpostman-icon.svg" alt="Postman">
      </a>
      <a href="https://reactjs.org/" target="_blank">
        <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original-wordmark.svg" alt="React">
      </a>
      <a href="https://reactnative.dev/" target="_blank">
        <img src="https://reactnative.dev/img/header_logo.svg" alt="React Native">
      </a>
      <a href="https://redux.js.org" target="_blank">
        <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/redux/redux-original.svg" alt="Redux">
      </a>
    </div>
  </div>
  
  <div class="footer">
    <p>© 2025 Sourav Sadhukhan. All rights reserved.</p>
  </div>
  
  <!-- Optional JavaScript for further interactivity -->
  <script>
    // For example, you could add interactive particle effects or dynamic themes here.
    // This is a placeholder for advanced JS features.
  </script>
</body>
</html>
