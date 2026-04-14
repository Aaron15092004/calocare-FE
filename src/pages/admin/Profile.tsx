// src/pages/admin/Profile.tsx
import { useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";

const Profile = () => {
    const { profile, user, updateProfile } = useAuthContext();
    const [displayName, setDisplayName] = useState(profile?.display_name || "");
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        await updateProfile({ display_name: displayName });
        setSaving(false);
    };

    return (
        <div className="space-y-6 max-w-xl">
            <div>
                <h1 className="text-2xl font-bold">Admin Profile</h1>
                <p className="text-muted-foreground">Manage your account</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Account Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Email</Label>
                        <Input value={user?.email || ""} disabled className="bg-gray-50" />
                    </div>
                    <div>
                        <Label>Display Name</Label>
                        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                    </div>
                    <div>
                        <Label>Role</Label>
                        <Input value={profile?.role || "admin"} disabled className="bg-gray-50" />
                    </div>
                    <Button onClick={handleSave} disabled={saving}>
                        <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default Profile;