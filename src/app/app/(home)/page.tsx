import ProfileSettingsForm from "./profile-settings-form";

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="py-10 text-3xl font-medium text-gray-900">
        Profile settings
      </h1>
      <ProfileSettingsForm />
    </div>
  );
}
