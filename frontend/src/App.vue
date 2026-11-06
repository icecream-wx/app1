<template>
  <div class="app-shell">
    <header class="app-header">
      <router-link to="/employees" class="brand">员工管理</router-link>
      <nav class="app-nav">
        <router-link to="/employees" class="nav-link">员工列表</router-link>
      </nav>
    </header>
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
</script>
