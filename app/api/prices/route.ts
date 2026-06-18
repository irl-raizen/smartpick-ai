export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const q = searchParams.get("q");

  // Temporary dummy data
  return Response.json({
    product: q,
    stores: [
      {
        name: "Amazon",
        price: 56999,
        link: "https://amazon.in"
      },
      {
        name: "Flipkart",
        price: 55999,
        link: "https://flipkart.com"
      }
    ]
  });
}
