/*
  # CampusRide Database Schema

  1. New Tables
    - rides
      - id (uuid, primary key)
      - driver_id (uuid, references auth.users)
      - pickup_location (text)
      - dropoff_location (text)
      - departure_time (timestamptz)
      - available_seats (int)
      - price (decimal)
      - status (text)
      - created_at (timestamptz)
    
    - ride_requests
      - id (uuid, primary key)
      - ride_id (uuid, references rides)
      - passenger_id (uuid, references auth.users)
      - status (text)
      - created_at (timestamptz)
    
    - messages
      - id (uuid, primary key)
      - ride_id (uuid, references rides)
      - sender_id (uuid, references auth.users)
      - content (text)
      - created_at (timestamptz)
    
    - profiles
      - id (uuid, primary key, references auth.users)
      - full_name (text)
      - avatar_url (text)
      - created_at (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users,
  full_name text NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create rides table
CREATE TABLE rides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES auth.users NOT NULL,
  pickup_location text NOT NULL,
  dropoff_location text NOT NULL,
  departure_time timestamptz NOT NULL,
  available_seats int NOT NULL CHECK (available_seats >= 0),
  price decimal NOT NULL CHECK (price >= 0),
  status text NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')) DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active rides"
  ON rides
  FOR SELECT
  TO authenticated
  USING (status = 'active' OR driver_id = auth.uid());

CREATE POLICY "Users can create rides"
  ON rides
  FOR INSERT
  TO authenticated
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Drivers can update their own rides"
  ON rides
  FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid());

-- Create ride_requests table
CREATE TABLE ride_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid REFERENCES rides NOT NULL,
  passenger_id uuid REFERENCES auth.users NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(ride_id, passenger_id)
);

ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own requests and requests for their rides"
  ON ride_requests
  FOR SELECT
  TO authenticated
  USING (
    passenger_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM rides 
      WHERE rides.id = ride_requests.ride_id 
      AND rides.driver_id = auth.uid()
    )
  );

CREATE POLICY "Users can create ride requests"
  ON ride_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (passenger_id = auth.uid());

CREATE POLICY "Users can update their own requests"
  ON ride_requests
  FOR UPDATE
  TO authenticated
  USING (
    passenger_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM rides 
      WHERE rides.id = ride_requests.ride_id 
      AND rides.driver_id = auth.uid()
    )
  );

-- Create messages table
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid REFERENCES rides NOT NULL,
  sender_id uuid REFERENCES auth.users NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read messages for their rides"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rides 
      WHERE rides.id = messages.ride_id 
      AND (
        rides.driver_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM ride_requests 
          WHERE ride_requests.ride_id = rides.id 
          AND ride_requests.passenger_id = auth.uid()
          AND ride_requests.status = 'accepted'
        )
      )
    )
  );

CREATE POLICY "Users can send messages for their rides"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rides 
      WHERE rides.id = messages.ride_id 
      AND (
        rides.driver_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM ride_requests 
          WHERE ride_requests.ride_id = rides.id 
          AND ride_requests.passenger_id = auth.uid()
          AND ride_requests.status = 'accepted'
        )
      )
    )
  );