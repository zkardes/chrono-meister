import RegistrationDebug from "@/components/RegistrationDebug";

const Debug = () => {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-8">System Debug</h1>
        <RegistrationDebug />
      </div>
    </div>
  );
};

export default Debug;