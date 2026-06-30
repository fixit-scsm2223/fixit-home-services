<template>
  <div class="fixit-app-root">
    <RouterView />
  </div>
</template>

<style>
.fixit-app-root {
  width: 100%;
  min-height: 100%;
  font-family: var(--font-main);
}

body.fixit-shell-layout .fixit-app-root {
  height: 100%;
}

body.fixit-document-layout .fixit-app-root {
  min-height: 100vh;
  height: auto;
}
</style>
