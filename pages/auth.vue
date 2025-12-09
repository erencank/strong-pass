<script setup lang="ts">
import { ref } from "vue";

// The auth store no longer maintains ephemeral login state,
// so we don't need to manually reset it here.

const currentTab = ref("login");

function handleRegistrationSuccess() {
  // Automatically switch to the login tab when registration completes
  currentTab.value = "login";
}
</script>

<template>
  <div
    class="container relative flex-col items-center justify-center content-center h-screen w-screen"
  >
    <!-- 
      Note: Added 'flex' to the container above to fix alignment 
      (it was just 'flex-col' without 'flex' in your snippet). 
    -->
    <div class="h-3/6">
      <div
        class="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]"
      >
        <div class="flex flex-col space-y-2 text-center items-center">
          <Tabs default-value="login" v-model:model-value="currentTab">
            <TabsList class="grid w-full grid-cols-2">
              <TabsTrigger value="login"> Login </TabsTrigger>
              <TabsTrigger value="register"> Register </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <LoginForm />
            </TabsContent>

            <TabsContent value="register">
              <RegisterForm @registration-success="handleRegistrationSuccess" />
            </TabsContent>
          </Tabs>
          <Button @click="handleTestClick">Test SRP Flow</Button>
        </div>
      </div>
    </div>
  </div>
</template>
