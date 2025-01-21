// JavaScript for handling the search form and dynamically showing search results
    document.getElementById('search-form').addEventListener('submit', function (event) {
      event.preventDefault();
      const query = document.getElementById('search-query').value.trim();

      if (query) {
        // Show search results container and hide the full bookmarks list and pagination
        document.getElementById('bookmarks-list').style.display = 'none';
        document.getElementById('pagination-nav').style.display = 'none';
        document.getElementById('search-results').style.display = 'block';

        // Perform the AJAX request to search for bookmarks
        axios.get('/search', { params: { query: query } })
          .then(response => {
            const searchResultsContainer = document.getElementById('search-results');
            searchResultsContainer.innerHTML = ''; // Clear any previous results

            if (response.data.length === 0) {
              searchResultsContainer.innerHTML = '<li class="list-group-item">No bookmarks found.</li>';
            } else {
              response.data.forEach(bookmark => {
                const listItem = document.createElement('li');
                listItem.classList.add('list-group-item');
                listItem.innerHTML = `
                  <div class="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>${bookmark.title}</strong> - 
                      <a href="${bookmark.url}" target="_blank">${bookmark.url}</a>
                      <br><small class="text-muted">Added on: ${new Date(bookmark.addedAt).toLocaleString()}</small>
                    </div>
                    <div>
                      <form action="/edit/${bookmark._id}" method="GET" class="d-inline">
                        <button type="submit" class="btn btn-sm btn-warning">Edit</button>
                      </form>
                      <form action="/delete-bookmark" method="POST" class="d-inline" onsubmit="return confirmDelete(event, '${bookmark.title}')">
                        <input type="hidden" name="id" value="${bookmark._id}">
                        <button type="submit" class="btn btn-sm btn-danger">Delete</button>
                      </form>
                    </div>
                  </div>
                `;
                searchResultsContainer.appendChild(listItem);
              });
            }
          })
          .catch(error => {
            console.error('Error searching bookmarks:', error);
          });
      } else {
        // If no search query, show the full bookmark list and pagination again
        document.getElementById('bookmarks-list').style.display = 'block';
        document.getElementById('pagination-nav').style.display = 'block';
        document.getElementById('search-results').style.display = 'none';
      }
    });