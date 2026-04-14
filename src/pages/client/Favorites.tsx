import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { useFavorites } from "@/hooks/useFavorites";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Apple, UtensilsCrossed, Trash2, Loader2, BookOpen } from "lucide-react";

const FoodFavoriteCard = ({
    fav,
    onRemove,
}: {
    fav: any;
    onRemove: (type: "food" | "recipe", id: string) => void;
}) => {
    const item = fav.item;
    if (!item) return null;
    return (
        <Card>
            <CardContent className="p-4 flex items-center gap-3">
                {item.image_url ? (
                    <img
                        src={item.image_url}
                        alt={item.name_vi}
                        className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                    />
                ) : (
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Apple className="w-6 h-6 text-primary" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{item.name_vi}</p>
                    {item.name_en && (
                        <p className="text-xs text-muted-foreground truncate">{item.name_en}</p>
                    )}
                    <p className="text-xs text-primary font-medium mt-0.5">
                        {item.energy_kcal || item.calories || 0} kcal / 100g
                    </p>
                </div>
                <button
                    onClick={() => onRemove("food", String(fav.item_id))}
                    className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </CardContent>
        </Card>
    );
};

const RecipeFavoriteCard = ({
    fav,
    onRemove,
}: {
    fav: any;
    onRemove: (type: "food" | "recipe", id: string) => void;
}) => {
    const navigate = useNavigate();
    const item = fav.item;
    if (!item) return null;
    return (
        <Card className="overflow-hidden">
            <CardContent className="p-0 flex items-stretch">
                {item.image_url ? (
                    <img
                        src={item.image_url}
                        alt={item.name_vi}
                        className="w-20 h-20 object-cover flex-shrink-0"
                    />
                ) : (
                    <div className="w-20 h-20 bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <UtensilsCrossed className="w-8 h-8 text-primary" />
                    </div>
                )}
                <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
                    <div>
                        <p className="font-semibold text-sm leading-tight line-clamp-2">
                            {item.name_vi}
                        </p>
                        <p className="text-xs text-primary font-medium mt-1">
                            {item.calories || 0} kcal / phần
                        </p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <button
                            onClick={() => navigate("/my-recipes")}
                            className="text-xs text-primary underline"
                        >
                            Xem công thức
                        </button>
                    </div>
                </div>
                <button
                    onClick={() => onRemove("recipe", String(fav.item_id))}
                    className="p-3 hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0 flex items-center"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </CardContent>
        </Card>
    );
};

const EmptyState = ({ type }: { type: "food" | "recipe" }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            {type === "food" ? (
                <Apple className="w-8 h-8 text-primary" />
            ) : (
                <BookOpen className="w-8 h-8 text-primary" />
            )}
        </div>
        <h3 className="font-semibold text-foreground mb-1">
            {type === "food" ? "Chưa có thực phẩm yêu thích" : "Chưa có công thức yêu thích"}
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
            {type === "food"
                ? "Quét mã vạch hoặc tìm thực phẩm để thêm vào yêu thích"
                : "Thêm công thức yêu thích từ trang Công thức của tôi"}
        </p>
    </div>
);

const Favorites = () => {
    const { toast } = useToast();
    const { favorites, loading, removeFavorite } = useFavorites();
    const [removing, setRemoving] = useState<string | null>(null);

    const foodFavs = favorites.filter((f) => f.item_type === "food");
    const recipeFavs = favorites.filter((f) => f.item_type === "recipe");

    const handleRemove = async (type: "food" | "recipe", id: string) => {
        setRemoving(id);
        await removeFavorite(type, id);
        setRemoving(null);
        toast({ title: "Đã xóa khỏi yêu thích" });
    };

    return (
        <div className="min-h-screen gradient-fresh pb-24">
            <Header />
            <main className="container px-4 py-6">
                {/* Page header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Heart className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Yêu thích</h1>
                        <p className="text-sm text-muted-foreground">
                            Thực phẩm & công thức đã lưu
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <Tabs defaultValue="foods">
                        <TabsList className="w-full mb-4">
                            <TabsTrigger value="foods" className="flex-1">
                                <Apple className="w-4 h-4 mr-1.5" />
                                Thực phẩm ({foodFavs.length})
                            </TabsTrigger>
                            <TabsTrigger value="recipes" className="flex-1">
                                <UtensilsCrossed className="w-4 h-4 mr-1.5" />
                                Công thức ({recipeFavs.length})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="foods" className="space-y-3 mt-0">
                            {foodFavs.length === 0 ? (
                                <EmptyState type="food" />
                            ) : (
                                foodFavs.map((fav) => (
                                    <FoodFavoriteCard
                                        key={fav._id}
                                        fav={fav}
                                        onRemove={handleRemove}
                                    />
                                ))
                            )}
                        </TabsContent>

                        <TabsContent value="recipes" className="space-y-3 mt-0">
                            {recipeFavs.length === 0 ? (
                                <EmptyState type="recipe" />
                            ) : (
                                recipeFavs.map((fav) => (
                                    <RecipeFavoriteCard
                                        key={fav._id}
                                        fav={fav}
                                        onRemove={handleRemove}
                                    />
                                ))
                            )}
                        </TabsContent>
                    </Tabs>
                )}
            </main>
            <BottomNav />
        </div>
    );
};

export default Favorites;
