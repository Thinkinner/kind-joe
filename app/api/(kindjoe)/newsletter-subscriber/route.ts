import { NextResponse } from "next/server";

// Function to add contact to Go High Level
const addEmailToGoHighLevel = async (
  email: string,
  firstName: string,
  lastName: string,
  recapType: string,
  zipCode?: string
) => {
  const goHighLevelApiKey = process.env.GOHIGHLEVEL_API_KEY;

  if (!goHighLevelApiKey) {
    throw new Error("API Key is missing. Please check your environment variables.");
  }

  // Ensure recapType is valid and prepare tags
  const validRecapTypes = ["Republican", "Democratic", "American Party", "All"];
  if (!validRecapTypes.includes(recapType)) {
    throw new Error("Invalid recap type. Must be 'Republican', 'Democratic', 'American Party', or 'All'.");
  }

  const payload = {
    email,
    firstName,
    lastName,
    source: "public api",
    tags: ["Newsletter Subscriber", recapType],
    customFields: [
      {
        name: "recapType",
        value: recapType,
      },
    ],
    ...(zipCode && { postalCode: zipCode }), // Add zip code if provided
  };

  console.log("Sending payload to Go High Level:", JSON.stringify(payload, null, 2));

  const response = await fetch("https://rest.gohighlevel.com/v1/contacts/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${goHighLevelApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorDetails = await response.text();
    console.error("Go High Level Response Details:", errorDetails);
    throw new Error(
      `Failed to add contact to Go High Level: ${response.status} ${response.statusText} - ${errorDetails}`
    );
  }

  const data = await response.json();
  console.log("Contact added to Go High Level successfully:", data);
  return data;
};

// Function to update contact with zip code in Go High Level
const updateEmailInGoHighLevel = async (email: string, zipCode: string) => {
  const goHighLevelApiKey = process.env.GOHIGHLEVEL_API_KEY;

  if (!goHighLevelApiKey) {
    throw new Error("API Key is missing. Please check your environment variables.");
  }

  // First, find the contact by email
  const searchResponse = await fetch(
    `https://rest.gohighlevel.com/v1/contacts/?query=${encodeURIComponent(email)}`,
    {
      headers: {
        Authorization: `Bearer ${goHighLevelApiKey}`,
      },
    }
  );

  if (!searchResponse.ok) {
    const errorDetails = await searchResponse.text();
    throw new Error(
      `Failed to find contact: ${searchResponse.status} ${searchResponse.statusText} - ${errorDetails}`
    );
  }

  const searchData = await searchResponse.json();
  const contact = searchData.contacts?.[0];

  if (!contact) {
    throw new Error("Contact not found.");
  }

  const payload = {
    postalCode: zipCode,
  };

  const response = await fetch(`https://rest.gohighlevel.com/v1/contacts/${contact.id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${goHighLevelApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorDetails = await response.text();
    console.error("Go High Level Update Response Details:", errorDetails);
    throw new Error(
      `Failed to update contact in Go High Level: ${response.status} ${response.statusText} - ${errorDetails}`
    );
  }

  const data = await response.json();
  console.log("Contact updated in Go High Level successfully:", data);
  return data;
};

// API route to handle POST and PUT requests
export const POST = async (req: Request) => {
  try {
    const { email, firstName, lastName, recapType } = await req.json();
    console.log("Incoming request data:", { email, firstName, lastName, recapType });

    // Validate required fields
    if (!email || !firstName || !lastName || !recapType) {
      return NextResponse.json(
        { error: "Email, first name, last name, and recap type are required" },
        { status: 400 }
      );
    }

    // Add contact to Go High Level
    const goHighLevelResponse = await addEmailToGoHighLevel(
      email,
      firstName,
      lastName,
      recapType
    );

    return NextResponse.json(
      {
        message: "Contact added successfully to Go High Level.",
        data: goHighLevelResponse,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error in /api/newslettersubscriber:", error.message);
      return NextResponse.json(
        { error: error.message || "An unexpected error occurred." },
        { status: 500 }
      );
    }

    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unknown error occurred." },
      { status: 500 }
    );
  }
};

export const PUT = async (req: Request) => {
  try {
    const { email, zipCode } = await req.json();
    console.log("Incoming update request data:", { email, zipCode });

    // Validate required fields
    if (!email || !zipCode) {
      return NextResponse.json(
        { error: "Email and zip code are required" },
        { status: 400 }
      );
    }

    // Update contact with zip code in Go High Level
    const goHighLevelResponse = await updateEmailInGoHighLevel(email, zipCode);

    return NextResponse.json(
      {
        message: "Zip code added successfully to Go High Level.",
        data: goHighLevelResponse,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error in /api/newslettersubscriber (PUT):", error.message);
      return NextResponse.json(
        { error: error.message || "An unexpected error occurred." },
        { status: 500 }
      );
    }

    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unknown error occurred." },
      { status: 500 }
    );
  }
};