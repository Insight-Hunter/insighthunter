<script lang="ts">
  let email = '';
  let password = '';
  let error = '';
  let success = '';

  async function handleSubmit(event: Event) {
    event.preventDefault();
    error = '';
    success = '';

    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        // Handle successful login
        // Redirect to dashboard on success
        window.location.href = '/dashboard';
        success = 'Login successful!';

      } else {
        const data = await response.json();
        error = data.error || 'Login failed';
      }
    } catch (e) {
      error = 'An error occurred during login.';
    }
  }
</script>

<form on:submit={handleSubmit}>
  {#if error}
    <p class="error">{error}</p>
  {/if}
  {#if success}
    <p class="success">{success}</p>
  {/if}
  <div>
    <label for="email">Email</label>
    <input type="email" id="email" bind:value={email} required />
  </div>
  <div>
    <label for="password">Password</label>
    <input type="password" id="password" bind:value={password} required />
  </div>
  <button type="submit">Log In</button>
</form>

<style>
  .error {
    color: red;
  }
  .success {
    color: green;
  }
</style>
