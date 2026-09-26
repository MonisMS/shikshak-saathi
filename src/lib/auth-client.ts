import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";

// `inferAdditionalFields<typeof auth>()` is a type-only import (erased at compile time)
// so this stays a pure client bundle — it does NOT pull in auth.ts's Prisma adapter.
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
});
// usage: await authClient.signUp.email({ name, email, password });
//        await authClient.signIn.email({ email, password });
//        await authClient.signOut();
//        await authClient.updateUser({ uiLanguage: "hi", ... }); // additionalFields, typed
