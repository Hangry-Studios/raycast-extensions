import { Grid, ActionPanel, Action, Detail, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";

interface SteamSearchItem {
  id: number;
  name: string;
  price?: { final: number };
}

interface SteamSearchResponse {
  items: SteamSearchItem[];
}

interface SteamAppDetails {
  [key: string]: {
    success: boolean;
    data: {
      short_description?: string;
      recommendations?: { total: number };
      developers?: string[];
      publishers?: string[];
      release_date?: { date: string };
      genres?: { description: string }[];
      pc_requirements?: { minimum?: string };
    };
  };
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [items, setItems] = useState<{ id: string; name: string; image: string; price?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchGames() {
      if (searchText.length < 2) {
        setItems([]);
        return;
      }
      setIsLoading(true);
      try {
        const response = await fetch(
          `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(searchText)}&l=english&cc=US`,
        );
        const data = (await response.json()) as SteamSearchResponse;
        if (data && data.items) {
          setItems(
            data.items.map((item) => ({
              id: item.id.toString(),
              name: item.name,
              image: `https://cdn.cloudflare.steamstatic.com/steam/apps/${item.id}/header.jpg`,
              price: item.price ? `$${item.price.final / 100}` : "Free to Play",
            })),
          );
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchGames();
  }, [searchText]);

  return (
    <Grid
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search games on Steam..."
      throttle
      columns={3}
      aspectRatio="16/9"
      fit={Grid.Fit.Fill}
    >
      {items.map((item) => (
        <Grid.Item
          key={item.id}
          content={{ source: item.image, fallback: Icon.GameController }}
          title={item.name}
          subtitle={item.price}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Details"
                icon={Icon.Sidebar}
                target={<GameDetail appId={item.id} name={item.name} image={item.image} price={item.price} />}
              />
              <Action.OpenInBrowser url={`https://store.steampowered.com/app/${item.id}`} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}

function GameDetail({ appId, name, image, price }: { appId: string; name: string; image: string; price?: string }) {
  const [details, setDetails] = useState<{
    description: string;
    reviews: string;
    developer: string;
    releaseDate: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetails() {
      try {
        const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`);
        const data = (await response.json()) as SteamAppDetails;
        if (data[appId]?.success) {
          const g = data[appId].data;
          setDetails({
            description: g.short_description?.replace(/<[^>]*>?/gm, "") || "",
            reviews: g.recommendations ? `${g.recommendations.total.toLocaleString()}` : "N/A",
            developer: g.developers?.join(", ") || "N/A",
            releaseDate: g.release_date?.date || "TBA",
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [appId]);

  return (
    <Detail
      isLoading={loading}
      markdown={`# ${name}\n![Header](${image})\n\n### Description\n${details?.description}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Price" text={price} />
          <Detail.Metadata.Label title="Developer" text={details?.developer} />
          <Detail.Metadata.Label title="Release Date" text={details?.releaseDate} />
          <Detail.Metadata.Label title="Score" text={details?.reviews} icon={Icon.Star} />
        </Detail.Metadata>
      }
    />
  );
}
