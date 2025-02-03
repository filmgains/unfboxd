document.getElementById('checkButton').addEventListener('click', async () => {
  const username = document.getElementById('username').value.trim();
  if (!username) {
    alert('Please enter a valid Letterboxd username.');
    return;
  }

  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '<p>Loading...</p>';

  try {
    const response = await fetch(`/.netlify/functions/checkFollow?username=${username}`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();

    if (data.error) {
      resultsDiv.innerHTML = `<p class="error">${data.error}</p>`;
    } else {
      resultsDiv.innerHTML = `
        <p><strong>Users who don't follow you back:</strong></p>
        <ul>
          ${data.notFollowingBack
            .map(
              (user) => `
                <li>
                  <a href="${user.profileUrl}" target="_blank" rel="noopener noreferrer">
                    ${user.username}
                  </a>
                </li>
              `
            )
            .join('')}
        </ul>
      `;
    }
  } catch (error) {
    console.error('Error:', error);
    resultsDiv.innerHTML = `<p class="error">An error occurred. Please try again.</p>`;
  }
});