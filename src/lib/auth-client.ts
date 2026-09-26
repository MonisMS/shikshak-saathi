import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
// usage: await authClient.signUp.email({ name, email, password });
//        await authClient.signIn.email({ email, password });
//        await authClient.signOut();
