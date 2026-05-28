import { useAuthContext } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Shield } from "lucide-react";

const OwnerProfile = () => {
    const { profile } = useAuthContext();

    return (
        <div className="max-w-lg space-y-6">
            <h1 className="text-2xl font-bold">Tài khoản</h1>
            <Card>
                <CardHeader><CardTitle className="text-base">Thông tin cá nhân</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                            {profile?.display_name?.[0]?.toUpperCase() || "S"}
                        </div>
                        <div>
                            <p className="font-semibold">{profile?.display_name}</p>
                            <Badge variant="outline" className="text-xs mt-0.5">Store Owner</Badge>
                        </div>
                    </div>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-4 h-4" />
                            {profile?.email}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Shield className="w-4 h-4" />
                            Vai trò: Store Owner
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default OwnerProfile;
