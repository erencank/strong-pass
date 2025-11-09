<script setup lang="ts">
import { ref } from "vue";
// Reset the auth store's state in case we landed here from an error
const authStore = useAuthStore();
authStore.resetLoginFlow();

const currentTab = ref("login");
function handleRegistrationSuccess() {
  console.log(currentTab.value);
  currentTab.value = "login";
}
</script>
<template>
  <div
    class="container relative flex-col items-center justify-center content-center h-screen w-screen"
  >
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
            <TabsContent value="login"><LoginForm /></TabsContent>
            <TabsContent value="register"
              ><RegisterForm @registration-success="handleRegistrationSuccess"
            /></TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  </div>
</template>
