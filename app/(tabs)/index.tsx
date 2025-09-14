import React, { useState, useEffect } from 'react';
import { Text, View, Button } from 'react-native';
import { Camera } from 'expo-camera';
import { createClient } from '@supabase/supabase-js';

// replace with your Supabase keys
const supabaseUrl = "https://YOUR_PROJECT.supabase.co";
const supabaseKey = "YOUR_ANON_KEY";
const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);
    alert(`Scanned: ${data}`);

    // Example insert into Supabase "scans"
    const { error } = await supabase.from('scans').insert([
      { item_number: data, qty_scanned: 1, scanned_by: "test_user" }
    ]);
    if (error) console.error(error);
  };

  if (hasPermission === null) {
    return <Text>Requesting camera permission</Text>;
  }
  if (hasPermission === false) {
    return <Text>No camera access</Text>;
  }

  return (
    <View style={{ flex: 1 }}>
      <Camera
        style={{ flex: 1 }}
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      {scanned && <Button title={'Tap to Scan Again'} onPress={() => setScanned(false)} />}
    </View>
  );
}

