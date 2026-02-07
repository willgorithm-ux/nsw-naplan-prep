import { navigate } from '../main.js';
import { getStorage } from '../storage.js';
export function renderWelcome(root) {
  root.innerHTML = `
    <div class="view view-welcome">
      <h1>Welcome to NAPLAN Mission! 🚀</h1>
      <p>Let's get ready!</p>
      <input type="text" id="nickname" placeholder="Enter your name" class="input-primary">
      <button class="btn-primary" onclick="handleNameSubmit()">Let's Go! →</button>
    </div>
  `;
  window.handleNameSubmit = async () => {
    const name = document.getElementById('nickname').value;
    if(name) {
      await getStorage().setProfile({ nickname: name });
      navigate('codesign');
    } else alert('Please enter a name!');
  };
}