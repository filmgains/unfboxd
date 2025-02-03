const axios = require('axios');
const cheerio = require('cheerio');

// Helper function to fetch all pages of a list (following or followers) concurrently
async function fetchAllPages(baseUrl, username, type) {
  let allUsers = [];
  let page = 1;
  let hasMorePages = true;
  const concurrentRequests = 5; // Number of pages to fetch in parallel
  const pagesToFetch = []; // Holds promises for concurrent requests

  while (hasMorePages) {
    const url = `${baseUrl}/${username}/${type}/page/${page}/`;
    const pagePromise = axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    })
      .then((response) => {
        const $ = cheerio.load(response.data);
        const usersOnPage = [];
        $('a.name').each((i, el) => {
          const username = $(el).attr('href').replace('/', '');
          const profileUrl = `https://letterboxd.com/${username}/`;
          usersOnPage.push({ username, profileUrl });
        });

        // If no users found, mark as the last page
        if (usersOnPage.length === 0) {
          hasMorePages = false;
        }

        return usersOnPage;
      })
      .catch((error) => {
        console.error(`Error fetching ${type} page ${page}:`, error);
        return []; // Return empty array in case of error
      });

    pagesToFetch.push(pagePromise);
    page++;

    // If we have reached the number of concurrent requests, wait for them to finish
    if (pagesToFetch.length >= concurrentRequests) {
      const results = await Promise.all(pagesToFetch);
      results.forEach((result) => {
        allUsers.push(...result);
      });
      pagesToFetch.length = 0; // Reset for the next batch
    }
  }

  // If there are remaining pages to fetch after the loop ends
  if (pagesToFetch.length > 0) {
    const results = await Promise.all(pagesToFetch);
    results.forEach((result) => {
      allUsers.push(...result);
    });
  }

  return allUsers;
}

exports.handler = async (event) => {
  const { username } = event.queryStringParameters;

  if (!username) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Username is required.' }),
    };
  }

  try {
    // Fetch all users from the "Following" list
    const followingUsers = await fetchAllPages('https://letterboxd.com', username, 'following');

    // Fetch all users from the "Followers" list
    const followersUsers = await fetchAllPages('https://letterboxd.com', username, 'followers');

    // Extract usernames from followers for comparison
    const followersUsernames = followersUsers.map(user => user.username);

    // Find users who don't follow back
    const notFollowingBack = followingUsers.filter(
      (user) => !followersUsernames.includes(user.username)
    );

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // Allow CORS
      },
      body: JSON.stringify({ notFollowingBack }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*', // Allow CORS
      },
      body: JSON.stringify({ error: 'Failed to fetch data. Please check the username and try again.' }),
    };
  }
};