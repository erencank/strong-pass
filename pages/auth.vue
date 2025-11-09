<script setup lang="ts">
// Reset the auth store's state in case we landed here from an error
const authStore = useAuthStore();
authStore.resetLoginFlow();
</script>

<template>
  <div class="flex min-h-screen items-center justify-center p-4">
    <Tabs default-value="login" class="w-full max-w-[400px]">
      <TabsList class="grid w-full grid-cols-2">
        <TabsTrigger value="login"> Log In </TabsTrigger>
        <TabsTrigger value="register"> Register </TabsTrigger>
      </TabsList>
      <TabsContent value="login">
        <Card>
          <CardHeader>
            <CardTitle class="card-title">Log In</CardTitle>
            <CardDescription class="card-description">
              Access your secure vault.
            </CardDescription>
          </CardHeader>
          <CardContent class="card-content">
            <LoginForm />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="register">
        <Card>
          <CardHeader>
            <CardTitle class="card-title">Register</CardTitle>
            <CardDescription class="card-description">
              Create a new zero-knowledge account.
            </CardDescription>
          </CardHeader>
          <CardContent class="card-content">
            <RegisterForm />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</template>
