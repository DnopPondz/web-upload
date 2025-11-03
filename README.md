# Next.js & Cloudinary example app

This example shows how to create an image gallery site using Next.js, [Cloudinary](https://cloudinary.com), and [Tailwind](https://tailwindcss.com).

## Deploy your own

Deploy the example using [Vercel](https://vercel.com?utm_source=github&utm_medium=readme&utm_campaign=next-example) or view the demo [here](https://nextconf-images.vercel.app/)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vercel/next.js/tree/canary/examples/with-cloudinary&project-name=nextjs-image-gallery&repository-name=with-cloudinary&env=NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,CLOUDINARY_API_KEY,CLOUDINARY_API_SECRET,CLOUDINARY_FOLDER&envDescription=API%20Keys%20from%20Cloudinary%20needed%20to%20run%20this%20application.)

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## How to use

Execute [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app) with [npm](https://docs.npmjs.com/cli/init), [Yarn](https://yarnpkg.com/lang/en/docs/cli/create/), or [pnpm](https://pnpm.io) to bootstrap the example:

```bash
npx create-next-app --example with-cloudinary with-cloudinary-app
```

```bash
yarn create next-app --example with-cloudinary with-cloudinary-app
```

```bash
pnpm create next-app --example with-cloudinary with-cloudinary-app
```

## References

- Cloudinary API: https://cloudinary.com/documentation/transformation_reference

## Multi-user PIN access

The gallery now supports per-user folders that are protected with a PIN code.

1. Create a `galleryUsers` collection in MongoDB with documents shaped like:

   ```json
   {
     "displayName": "User 1",
     "folder": "userimg1",
     "pinHash": "<salt:hash>",
     "avatarPublicId": "optional/avatar/public_id",
     "pinHint": "(optional) ตัวช่วยจำรหัส"
   }
   ```

   Use the helper exported from `utils/pinHash.ts` to generate the `pinHash` value for a PIN before inserting it, or call the
   `POST /api/users/register` endpoint with `displayName`, `folder`, and `pin` to insert a new user through the API. Optional
   fields include `avatarPublicId` and `pinHint`.

2. Upload user photos to Cloudinary folders that match the `folder` field.

3. Define `USER_PIN_SECRET` in `.env.local`; it is used to sign the session cookie after a PIN is verified.

When a visitor opens the site they choose their user card, enter the PIN, and only the images from that user's Cloudinary folder are displayed. All uploads, deletions, and metadata updates are scoped to the authenticated user's folder.
