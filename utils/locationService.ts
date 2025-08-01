// Serviço para conversão de coordenadas em nomes de locais
export async function getLocationName(lat: number, lng: number): Promise<string> {
  try {
    // Criar AbortController com timeout de 10 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    // Usando OpenStreetMap Nominatim (gratuito, sem API key necessária)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'TimeTracker/1.0'
        }
      }
    );

    // Limpar o timeout se a requisição foi bem-sucedida
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('Falha na requisição de geolocalização');
    }

    const data = await response.json();
    
    if (data && data.display_name) {
      // Extrair informações relevantes do endereço
      const address = data.address || {};
      
      // Priorizar informações mais específicas
      const parts = [];
      
      if (address.house_number && address.road) {
        parts.push(`${address.road} ${address.house_number}`);
      } else if (address.road) {
        parts.push(address.road);
      }
      
      if (address.neighbourhood) {
        parts.push(address.neighbourhood);
      } else if (address.suburb) {
        parts.push(address.suburb);
      }
      
      if (address.city) {
        parts.push(address.city);
      } else if (address.town) {
        parts.push(address.town);
      } else if (address.village) {
        parts.push(address.village);
      }
      
      // Se não conseguiu extrair partes específicas, usar display_name truncado
      if (parts.length === 0) {
        const displayName = data.display_name;
        // Pegar apenas os primeiros 3 elementos do endereço completo
        const addressParts = displayName.split(',').slice(0, 2);
        return addressParts.join(' ').trim();
      }
      
      return parts.join(' ');
    }
    
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (error) {
    // Tratamento mais específico de erros
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn('Timeout na requisição de geolocalização');
      } else if (error.message.includes('fetch')) {
        console.warn('Erro de rede ao obter localização:', error.message);
      } else {
        console.warn('Erro ao obter nome do local:', error.message);
      }
    } else {
      console.warn('Erro desconhecido ao obter localização');
    }
    
    // Fallback para coordenadas se falhar
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

// Cache para evitar múltiplas requisições para a mesma localização
const locationCache = new Map<string, string>();

export async function getLocationNameCached(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  
  if (locationCache.has(key)) {
    return locationCache.get(key)!;
  }
  
  const locationName = await getLocationName(lat, lng);
  locationCache.set(key, locationName);
  
  return locationName;
}

// Função para limpar texto para CSV (remover acentos e caracteres especiais)
export function cleanTextForCSV(text: string): string {
  if (!text) return '';
  
  return text
    // Remover acentos
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Remover caracteres especiais exceto espaços, pontos, hífens e números
    .replace(/[^\w\s.-]/g, ' ')
    // Remover vírgulas e ponto e vírgulas que quebram o CSV
    .replace(/[,;]/g, ' ')
    // Remover espaços duplos
    .replace(/\s+/g, ' ')
    // Limitar a 40 caracteres para manter legibilidade
    .substring(0, 40)
    .trim();
}